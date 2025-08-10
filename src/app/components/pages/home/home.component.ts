import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService, User } from '../../../services/api/user.service';
import { MessageService } from '../../../services/api/message.service';
import { SocketService } from '../../../services/socket/socket.service';
import { interval, Subscription } from 'rxjs';

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  senderName: string;
}

interface UserWithNotification extends User {
  hasUnreadMessage?: boolean;
  lastMessageTime?: Date;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private socketService = inject(SocketService);
  private router = inject(Router);

  // Signals for reactive state
  users = signal<UserWithNotification[]>([]);
  filteredUsers = signal<UserWithNotification[]>([]);
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  currentUser = signal<any>(null);

  // Chat signals
  selectedUser = signal<UserWithNotification | null>(null);
  messages = signal<Message[]>([]);
  newMessage = signal('');
  sendingMessage = signal(false);
  loadingMessages = signal(false);

  // Subscriptions
  private refreshSubscription?: Subscription;
  private socketSubscription?: Subscription;

  ngOnInit() {
    this.currentUser.set(this.authService.getCurrentUser());

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUsers();

    // Connect to WebSocket
    this.socketService.connect();

    // Listen for new messages with notification highlighting
    this.socketSubscription = this.socketService
      .getNewMessages()
      .subscribe((newMessages) => {
        newMessages.forEach((socketMessage) => {
          // Add message to current conversation if it's the selected user
          const selectedUser = this.selectedUser();
          if (
            selectedUser &&
            (socketMessage.from === selectedUser.username ||
              socketMessage.to === selectedUser.username)
          ) {
            const message: Message = {
              id: socketMessage.id,
              from: socketMessage.from,
              to: socketMessage.to,
              content:
                typeof socketMessage.content === 'string'
                  ? socketMessage.content
                  : JSON.stringify(socketMessage.content),
              timestamp: new Date(socketMessage.timestamp),
              status: socketMessage.status as 'sent' | 'delivered' | 'read',
              senderName: socketMessage.senderName,
            };

            this.messages.update((messages) => [...messages, message]);
          }

          // Highlight user in chat list when message arrives
          if (socketMessage.from !== this.currentUser()?.username) {
            this.highlightUserWithNewMessage(socketMessage.from);
          }
        });
      });

    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadUsers(false);
      if (this.selectedUser()) {
        this.loadMessages();
      }
    });
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
    this.socketSubscription?.unsubscribe();
    this.socketService.disconnect();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadUsers(showLoading = true) {
    if (showLoading) this.loading.set(true);
    this.error.set('');

    this.userService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success) {
          const usersWithStatus = this.userService.simulateOnlineStatus(
            response.data
          );

          // FIX: Strictly filter out current user - multiple checks
          const currentUsername = this.currentUser()?.username;
          const currentUserId = this.currentUser()?.id;

          const filteredUsers = usersWithStatus.filter((user) => {
            // Filter by username
            if (user.username === currentUsername) return false;
            // Filter by id if available
            if (user.id === currentUserId) return false;
            // Filter by email if same
            if (user.email === this.currentUser()?.email) return false;
            return true;
          });

          console.log('Current user:', currentUsername);
          console.log('Total users from API:', response.data.length);
          console.log('Filtered users (excluding self):', filteredUsers.length);

          // Add notification properties
          const usersWithNotifications: UserWithNotification[] =
            filteredUsers.map((user) => ({
              ...user,
              hasUnreadMessage: false,
              lastMessageTime: undefined,
            }));

          this.users.set(usersWithNotifications);
          this.applySearch();
        } else {
          this.error.set(response.message || 'Failed to load users');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Load users error:', error);

        if (error.includes('authorization denied') || error.includes('Token')) {
          this.authService.logout();
          return;
        }

        this.error.set('Failed to load users. Please try again.');
        this.loading.set(false);
      },
    });
  }

  // Highlight user when new message arrives
  highlightUserWithNewMessage(fromUsername: string) {
    this.users.update((users) =>
      users.map((user) => {
        if (user.username === fromUsername) {
          return {
            ...user,
            hasUnreadMessage: true,
            lastMessageTime: new Date(),
          };
        }
        return user;
      })
    );

    // Update filtered users as well
    this.applySearch();
  }

  // Clear notification when user opens chat
  startChat(user: UserWithNotification) {
    // Clear notification for this user
    this.users.update((users) =>
      users.map((u) => {
        if (u.username === user.username) {
          return {
            ...u,
            hasUnreadMessage: false,
            lastMessageTime: undefined,
          };
        }
        return u;
      })
    );

    this.selectedUser.set(user);
    this.loadMessages();
    this.applySearch(); // Refresh to remove highlight
  }

  loadMessages() {
    const user = this.selectedUser();
    if (!user) return;

    this.loadingMessages.set(true);

    this.messageService.getMessages(user.username).subscribe({
      next: (response) => {
        if (response.success && response.data.messages) {
          const processedMessages = response.data.messages.map((msg: any) => ({
            id: msg._id || msg.id,
            from: msg.from,
            to: msg.to,
            content: msg.content?.text || msg.content || msg.message || '',
            timestamp: new Date(msg.timestamp),
            status: msg.status || 'sent',
            senderName: msg.senderName || msg.from,
          }));

          this.messages.set(processedMessages);
        } else {
          this.messages.set([]);
        }
        this.loadingMessages.set(false);
      },
      error: (error) => {
        console.error('Load messages error:', error);
        this.messages.set([]);
        this.loadingMessages.set(false);
      },
    });
  }

  sendMessage() {
    const content = this.newMessage().trim();
    const user = this.selectedUser();

    if (!content || !user || this.sendingMessage()) return;

    this.sendingMessage.set(true);

    const messageData = {
      from_username: this.currentUser()?.username,
      to: user.username,
      message: content,
      contact_name: user.name,
    };

    this.messageService.sendMessage(messageData).subscribe({
      next: (response) => {
        if (response.success) {
          const newMsg: Message = {
            id: response.data.message_id || Date.now().toString(),
            from: this.currentUser()?.username || '',
            to: user.username,
            content: content,
            timestamp: new Date(),
            status: 'sent',
            senderName: this.currentUser()?.name || 'You',
          };

          this.messages.update((messages) => [...messages, newMsg]);
          this.newMessage.set('');

          setTimeout(() => {
            this.messages.update((messages) =>
              messages.map((msg) =>
                msg.id === newMsg.id ? { ...msg, status: 'delivered' } : msg
              )
            );
          }, 1000);
        }
        this.sendingMessage.set(false);
      },
      error: (error) => {
        console.error('Send message error:', error);
        this.sendingMessage.set(false);
      },
    });
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value);
    this.applySearch();
  }

  applySearch() {
    const query = this.searchQuery().toLowerCase().trim();
    const allUsers = this.users();

    if (!query) {
      this.filteredUsers.set(allUsers);
    } else {
      const filtered = allUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query)
      );
      this.filteredUsers.set(filtered);
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getAvatarColor(username: string): string {
    const colors = [
      '#10B981',
      '#3B82F6',
      '#8B5CF6',
      '#F59E0B',
      '#EF4444',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
    ];

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return colors[Math.abs(hash) % colors.length];
  }

  getLastSeenText(user: UserWithNotification): string {
    if (user.isOnline) return 'online';
    if (!user.lastSeen) return 'last seen recently';

    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return 'last seen just now';
    if (diffMinutes < 60) return `last seen ${diffMinutes}m ago`;
    if (diffHours < 24) return `last seen ${diffHours}h ago`;
    return 'last seen recently';
  }

  formatMessageTime(timestamp: Date): string {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffDays = Math.floor(
      (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return msgDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return (
        'Yesterday ' +
        msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } else {
      return msgDate.toLocaleDateString();
    }
  }

  scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  closeChat() {
    this.selectedUser.set(null);
    this.messages.set([]);
  }

  logout() {
    this.authService.logout();
  }
}

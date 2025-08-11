import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  HostListener,
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
  lastMessage?: string;
  unreadCount?: number;
  sortPriority?: number;
  isOnline?: boolean;
  lastSeen?: Date;
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

  users = signal<UserWithNotification[]>([]);
  filteredUsers = signal<UserWithNotification[]>([]);
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  currentUser = signal<any>(null);

  selectedUser = signal<UserWithNotification | null>(null);
  messages = signal<Message[]>([]);
  newMessage = signal('');
  sendingMessage = signal(false);
  loadingMessages = signal(false);

  isMobileView = signal(false);
  socketConnected = signal(false);
  socketDebugInfo = signal<any>({});

  private refreshSubscription?: Subscription;
  private socketSubscription?: Subscription;
  private onlineStatusSubscription?: Subscription;
  private connectionStatusSubscription?: Subscription;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobileView();
  }

  ngOnInit() {
    try {
      const currentUser = this.authService.getCurrentUser();
      this.currentUser.set(currentUser);

      if (!this.authService.isLoggedIn() || !currentUser) {
        this.router.navigate(['/login']);
        return;
      }

      if (!currentUser.username || !currentUser.name) {
        this.authService.logout();
        return;
      }

      if (!this.authService.isTokenValid()) {
        this.authService.logout();
        return;
      }

      this.checkMobileView();

      this.loadUsersWithRetry();

      setTimeout(() => {
        if (this.authService.isLoggedIn() && this.currentUser()?.username) {
          this.initializeSocket();
        }
      }, 1000);

      this.setupPeriodicRefresh();
      this.initializeOnlineStatusTracking();
    } catch (error) {
      console.error('❌ Home component initialization error:', error);
      this.authService.logout();
    }
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
    this.socketSubscription?.unsubscribe();
    this.onlineStatusSubscription?.unsubscribe();
    this.connectionStatusSubscription?.unsubscribe();

    try {
      this.socketService.disconnect();
    } catch (error) {
      console.error('❌ Socket disconnect error:', error);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private loadUsersWithRetry(retries = 3) {
    this.loadUsers();

    setTimeout(() => {
      if (this.error() && retries > 0 && this.authService.isLoggedIn()) {
        this.loadUsersWithRetry(retries - 1);
      }
    }, 2000);
  }

  private setupPeriodicRefresh() {
    this.refreshSubscription = interval(70000).subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.updateOnlineStatus();
        this.loadUsers(false);

        if (this.selectedUser() && !this.socketConnected()) {
          this.loadMessages();
        }
      } else {
        this.refreshSubscription?.unsubscribe();
        this.authService.logout();
      }
    });
  }

  private updateSocketDebugInfo() {
    try {
      const debugInfo = this.socketService.getSocketDebugInfo();
      this.socketDebugInfo.set(debugInfo);
    } catch (error) {
      this.socketDebugInfo.set({
        exists: false,
        connected: false,
        id: null,
        transport: null,
      });
    }
  }

  private checkMobileView() {
    const isMobile = window.innerWidth < 768;
    this.isMobileView.set(isMobile);
  }

  private initializeSocket() {
    try {
      this.socketService.disconnect();

      setTimeout(() => {
        this.socketService.connect();

        this.connectionStatusSubscription = this.socketService
          .getConnectionStatus()
          .subscribe({
            next: (isConnected: boolean) => {
              this.socketConnected.set(isConnected);
              this.updateSocketDebugInfo();

              if (isConnected && this.currentUser()?.username) {
                setTimeout(() => {
                  this.socketService.joinUser(this.currentUser().username);
                }, 2000);
              }
            },
            error: (error: any) => {
              this.socketConnected.set(false);
              if (
                error.message?.includes('Authentication') ||
                error.message?.includes('Unauthorized')
              ) {
                this.authService.logout();
              }
            },
          });

        this.socketSubscription = this.socketService
          .getNewMessages()
          .subscribe({
            next: (newMessages: any) => {
              this.socketConnected.set(true);

              if (Array.isArray(newMessages) && newMessages.length > 0) {
                newMessages.forEach((socketMessage: any) => {
                  this.handleIncomingMessage(socketMessage);
                });
              } else if (newMessages && !Array.isArray(newMessages)) {
                this.handleIncomingMessage(newMessages);
              }
            },
            error: (error: any) => {
              console.error('❌ Socket message error:', error);
              this.socketConnected.set(false);

              if (
                error.message?.includes('Authentication') ||
                error.message?.includes('Unauthorized')
              ) {
                this.authService.logout();
                return;
              }

              setTimeout(() => {
                if (this.authService.isLoggedIn()) {
                  this.initializeSocket();
                }
              }, 5000);
            },
            complete: () => {
              this.socketConnected.set(false);
            },
          });
      }, 1000);
    } catch (error) {
      console.error('❌ Socket initialization error:', error);
      this.socketConnected.set(false);

      setTimeout(() => {
        if (this.authService.isLoggedIn()) {
          this.initializeSocket();
        }
      }, 5000);
    }
  }

  private handleIncomingMessage(socketMessage: any) {
    if (!socketMessage || !socketMessage.from) {
      return;
    }

    const selectedUser = this.selectedUser();
    const currentUsername = this.currentUser()?.username;

    let messageContent = '';
    if (typeof socketMessage.content === 'string') {
      messageContent = socketMessage.content;
    } else if (
      socketMessage.content &&
      typeof socketMessage.content === 'object'
    ) {
      messageContent =
        socketMessage.content.text ||
        socketMessage.content.message ||
        JSON.stringify(socketMessage.content);
    } else if (socketMessage.message) {
      messageContent = socketMessage.message;
    } else {
      messageContent = 'New message';
    }

    if (
      selectedUser &&
      (socketMessage.from === selectedUser.username ||
        (socketMessage.to === currentUsername &&
          socketMessage.from === selectedUser.username))
    ) {
      const message: Message = {
        id:
          socketMessage.id ||
          socketMessage._id ||
          `socket-${Date.now()}-${Math.random()}`,
        from: socketMessage.from,
        to: socketMessage.to || currentUsername || '',
        content: messageContent,
        timestamp: new Date(
          socketMessage.timestamp || socketMessage.createdAt || Date.now()
        ),
        status:
          (socketMessage.status as 'sent' | 'delivered' | 'read') ||
          'delivered',
        senderName: socketMessage.senderName || socketMessage.from,
      };

      this.messages.update((messages) => {
        const exists = messages.some(
          (m) =>
            m.id === message.id ||
            (m.content === message.content &&
              m.from === message.from &&
              Math.abs(
                new Date(m.timestamp).getTime() - message.timestamp.getTime()
              ) < 2000)
        );

        if (!exists) {
          return [...messages, message];
        }
        return messages;
      });

      setTimeout(() => this.scrollToBottom(), 100);
    }

    if (
      socketMessage.from !== currentUsername &&
      (!selectedUser || socketMessage.from !== selectedUser.username)
    ) {
      this.moveUserToTopWithMessage(
        socketMessage.from,
        messageContent,
        new Date(
          socketMessage.timestamp || socketMessage.createdAt || Date.now()
        )
      );
    }
  }

  private moveUserToTopWithMessage(
    fromUsername: string,
    messageContent: string,
    timestamp: Date
  ) {
    this.users.update((users) =>
      users.map((user) => {
        if (user.username === fromUsername) {
          return {
            ...user,
            hasUnreadMessage: true,
            lastMessageTime: timestamp,
            lastMessage: messageContent,
            unreadCount: (user.unreadCount || 0) + 1,
            sortPriority: Date.now(),
          };
        }
        return user;
      })
    );

    this.applySearch();
  }

  private initializeOnlineStatusTracking() {
    this.onlineStatusSubscription = this.socketService
      .getOnlineUsers()
      .subscribe({
        next: (onlineUsers: string[]) => {
          this.updateUsersOnlineStatus(onlineUsers);
        },
        error: () => {
          this.fallbackOnlineStatusCheck();
        },
      });
  }

  private updateUsersOnlineStatus(onlineUsers: string[]) {
    this.users.update((users) =>
      users.map((user) => ({
        ...user,
        isOnline: onlineUsers.includes(user.username),
        lastSeen: onlineUsers.includes(user.username)
          ? new Date()
          : user.lastSeen,
      }))
    );
    this.applySearch();
  }

  private fallbackOnlineStatusCheck() {
    setInterval(() => {
      if (!this.authService.isLoggedIn()) {
        return;
      }

      this.userService.getOnlineUsers().subscribe({
        next: (response: any) => {
          if (response.success) {
            this.updateUsersOnlineStatus(response.data.onlineUsers);
          }
        },
        error: (error: any) => {
          if (
            error?.status === 401 &&
            (error?.error?.message?.includes('Token') ||
              error?.error?.message?.includes('Unauthorized'))
          ) {
            this.authService.logout();
            return;
          }

          this.simulateOnlineStatusChanges();
        },
      });
    }, 30000);
  }

  private simulateOnlineStatusChanges() {
    this.users.update((users) =>
      users.map((user) => ({
        ...user,
        isOnline: Math.random() > 0.3,
        lastSeen: user.isOnline
          ? new Date()
          : new Date(Date.now() - Math.random() * 3600000),
      }))
    );
    this.applySearch();
  }

  private updateOnlineStatus() {
    this.simulateOnlineStatusChanges();
  }

  loadUsers(showLoading = true) {
    if (showLoading) this.loading.set(true);
    this.error.set('');

    if (!this.authService.isLoggedIn()) {
      this.authService.logout();
      return;
    }

    this.userService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success) {
          const usersWithStatus = response.data || [];
          const currentUsername = this.currentUser()?.username;
          const currentUserId = this.currentUser()?.id;

          const filteredUsers = usersWithStatus.filter((user: any) => {
            if (user.username === currentUsername) return false;
            if (user.id === currentUserId) return false;
            if (user.email === this.currentUser()?.email) return false;
            return true;
          });

          const usersWithNotifications: UserWithNotification[] =
            filteredUsers.map((user: any) => ({
              ...user,
              hasUnreadMessage: user.hasUnreadMessage || false,
              lastMessageTime: user.lastMessageTime || undefined,
              lastMessage: user.lastMessage || undefined,
              unreadCount: user.unreadCount || 0,
              sortPriority: user.sortPriority || 0,
              isOnline:
                user.isOnline !== undefined
                  ? user.isOnline
                  : Math.random() > 0.5,
              lastSeen: user.lastSeen
                ? new Date(user.lastSeen)
                : new Date(Date.now() - Math.random() * 3600000),
            }));

          this.users.set(usersWithNotifications);
          this.applySearch();
        } else {
          this.error.set(response.message || 'Failed to load users');
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Load users error:', error);

        const errorStatus = error?.status;
        const errorMessage = error?.message || error?.error?.message || '';

        if (
          errorStatus === 401 &&
          (errorMessage.includes('Token') ||
            errorMessage.includes('authorization') ||
            errorMessage.includes('Unauthorized') ||
            errorMessage.includes('expired'))
        ) {
          this.authService.logout();
          return;
        }

        this.error.set('Failed to load users. Please try again.');
        this.loading.set(false);
      },
    });
  }

  getSortedUsers(): UserWithNotification[] {
    const users = this.filteredUsers();

    return [...users].sort((a, b) => {
      if (a.hasUnreadMessage && !b.hasUnreadMessage) return -1;
      if (!a.hasUnreadMessage && b.hasUnreadMessage) return 1;

      if (a.hasUnreadMessage && b.hasUnreadMessage) {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      }

      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      return a.name.localeCompare(b.name);
    });
  }

  startChat(user: UserWithNotification) {
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getToken();

    if (!this.authService.isLoggedIn() || !currentUser || !token) {
      this.authService.logout();
      return;
    }

    if (!currentUser.username || !currentUser.name) {
      console.error('❌ Invalid current user data in startChat');
      this.authService.logout();
      return;
    }

    if (!user.username || !user.name) {
      console.error('❌ Invalid target user data in startChat');
      this.error.set('Invalid user data. Please refresh and try again.');
      return;
    }

    if (user.username === currentUser.username) {
      this.error.set('Cannot start a conversation with yourself.');
      return;
    }

    this.users.update((users) =>
      users.map((u) => {
        if (u.username === user.username) {
          return {
            ...u,
            hasUnreadMessage: false,
            lastMessageTime: undefined,
            lastMessage: undefined,
            unreadCount: 0,
            sortPriority: 0,
          };
        }
        return u;
      })
    );

    this.selectedUser.set(user);
    this.loadMessagesSecure();
    this.applySearch();
  }

  private loadMessagesSecure() {
    const user = this.selectedUser();
    if (!user) return;

    if (!this.authService.isLoggedIn()) {
      this.authService.logout();
      return;
    }

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
      error: (error: any) => {
        console.error('❌ Load messages error:', error);

        const errorStatus = error?.status;
        const errorMessage = error?.message || error?.error?.message || '';

        if (errorStatus === 401 || errorStatus === 403) {
          if (
            errorMessage.includes('Token') ||
            errorMessage.includes('Unauthorized') ||
            errorMessage.includes('access')
          ) {
            this.authService.logout();
            return;
          }
        }

        this.messages.set([]);
        this.loadingMessages.set(false);

        this.error.set('Could not load conversation. Please try again.');
        setTimeout(() => this.error.set(''), 5000);
      },
    });
  }

  loadMessages() {
    this.loadMessagesSecure();
  }

  sendMessage() {
    const content = this.newMessage().trim();
    const user = this.selectedUser();

    if (!content || !user || this.sendingMessage()) return;

    if (!this.authService.isLoggedIn()) {
      console.log('❌ Not authenticated, cannot send message');
      this.authService.logout();
      return;
    }

    this.sendingMessage.set(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      from: this.currentUser()?.username || '',
      to: user.username,
      content: content,
      timestamp: new Date(),
      status: 'sent',
      senderName: this.currentUser()?.name || 'You',
    };

    this.messages.update((messages) => [...messages, optimisticMessage]);
    this.newMessage.set('');

    if (this.socketConnected()) {
      const socketMessageData = {
        to: user.username,
        from: this.currentUser()?.username,
        message: content,
        messageId: tempId,
      };

      this.socketService.sendMessage(socketMessageData);
    }

    const messageData = {
      from_username: this.currentUser()?.username,
      to: user.username,
      message: content,
      contact_name: user.name,
    };

    this.messageService.sendMessage(messageData).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages.update((messages) =>
            messages.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    id: response.data.message_id || tempId,
                    status: 'delivered',
                  }
                : msg
            )
          );
        } else {
          this.messages.update((messages) =>
            messages.filter((msg) => msg.id !== tempId)
          );
        }
        this.sendingMessage.set(false);
      },
      error: (error: any) => {
        console.error('❌ Send message error:', error);

        const errorStatus = error?.status;
        const errorMessage = error?.message || error?.error?.message || '';

        if (
          errorStatus === 401 &&
          (errorMessage.includes('Token') ||
            errorMessage.includes('Unauthorized'))
        ) {
          console.log('🔒 Authentication failed in sendMessage, logging out');
          this.authService.logout();
          return;
        }

        this.messages.update((messages) =>
          messages.filter((msg) => msg.id !== tempId)
        );
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

  isRecentMessage(timestamp: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    return diffMs < 10000;
  }

  truncateMessage(message: string): string {
    return message.length > 30 ? message.substring(0, 30) + '...' : message;
  }

  formatLastMessageTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
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

  closeChatMobile() {
    this.selectedUser.set(null);
    this.messages.set([]);
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
    }
  }
}

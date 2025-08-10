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
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { User } from '../../../services/api/user.service';
import { interval, Subscription } from 'rxjs';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  // Signals
  selectedUser = signal<User | null>(null);
  currentUser = signal<any>(null);
  messages = signal<Message[]>([]);
  newMessage = signal('');
  isTyping = signal(false);
  userTyping = signal(false);

  // Subscriptions
  private presenceSubscription?: Subscription;
  private typingTimeout?: any;

  ngOnInit() {
    this.currentUser.set(this.authService.getCurrentUser());

    // Get user from route parameters
    this.route.params.subscribe((params) => {
      if (params['userId']) {
        this.loadUserChat(params['userId']);
      }
    });

    // Simulate user presence updates
    this.presenceSubscription = interval(10000).subscribe(() => {
      this.updateUserPresence();
    });

    // Load sample messages
    this.loadSampleMessages();
  }

  ngOnDestroy() {
    this.presenceSubscription?.unsubscribe();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadUserChat(userId: string) {
    // In a real app, you'd fetch user data from your service
    // For now, we'll create a sample user
    const sampleUser: User = {
      id: userId,
      username: userId === 'john_doe' ? 'john_doe' : 'user_' + userId,
      name: userId === 'john_doe' ? 'John Doe' : 'Sample User',
      email: `${userId}@example.com`,
      phone: '+1234567890',
      isOnline: Math.random() > 0.3,
      lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    this.selectedUser.set(sampleUser);
  }

  loadSampleMessages() {
    const sampleMessages: Message[] = [
      {
        id: '1',
        senderId: 'john_doe',
        senderName: 'John Doe',
        content: 'Hey there! How are you doing?',
        timestamp: new Date(Date.now() - 3600000),
        status: 'read',
      },
      {
        id: '2',
        senderId: this.currentUser()?.id || 'current_user',
        senderName: this.currentUser()?.name || 'You',
        content: "Hello John! I'm doing great, thanks for asking.",
        timestamp: new Date(Date.now() - 3000000),
        status: 'delivered',
      },
      {
        id: '3',
        senderId: 'john_doe',
        senderName: 'John Doe',
        content: "That's awesome! Are you free for a quick chat?",
        timestamp: new Date(Date.now() - 1800000),
        status: 'read',
      },
    ];

    this.messages.set(sampleMessages);
  }

  updateUserPresence() {
    const user = this.selectedUser();
    if (user) {
      // Simulate presence changes
      const updatedUser = {
        ...user,
        isOnline: Math.random() > 0.4,
        lastSeen: user.isOnline
          ? new Date()
          : new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
      };
      this.selectedUser.set(updatedUser);
    }
  }

  sendMessage() {
    const content = this.newMessage().trim();
    if (!content || !this.selectedUser()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: this.currentUser()?.id || 'current_user',
      senderName: this.currentUser()?.name || 'You',
      content,
      timestamp: new Date(),
      status: 'sent',
    };

    this.messages.update((messages) => [...messages, newMsg]);
    this.newMessage.set('');

    // Simulate message delivery after 1 second
    setTimeout(() => {
      this.messages.update((messages) =>
        messages.map((msg) =>
          msg.id === newMsg.id ? { ...msg, status: 'delivered' } : msg
        )
      );
    }, 1000);

    // Simulate automatic reply from the user (for demo)
    if (this.selectedUser()?.username === 'john_doe') {
      setTimeout(() => {
        const replyMsg: Message = {
          id: (Date.now() + 1).toString(),
          senderId: 'john_doe',
          senderName: 'John Doe',
          content: this.getRandomReply(),
          timestamp: new Date(),
          status: 'sent',
        };
        this.messages.update((messages) => [...messages, replyMsg]);
      }, 2000);
    }
  }

  getRandomReply(): string {
    const replies = [
      "That's interesting!",
      'I see what you mean.',
      'Thanks for sharing that.',
      'Could you tell me more?',
      'That sounds great!',
      'I understand.',
      'What do you think about that?',
      "That's a good point.",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  onTyping() {
    this.isTyping.set(true);

    if (this.typingTimeout) clearTimeout(this.typingTimeout);

    this.typingTimeout = setTimeout(() => {
      this.isTyping.set(false);
    }, 2000);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getLastSeenText(user: User): string {
    if (user.isOnline) return 'online';
    if (!user.lastSeen) return 'last seen recently';

    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'last seen just now';
    if (diffMinutes < 60)
      return `last seen ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'last seen yesterday';
    if (diffDays < 7) return `last seen ${diffDays} days ago`;

    return `last seen ${lastSeen.toLocaleDateString()}`;
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
      return (
        msgDate.toLocaleDateString() +
        ' ' +
        msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }
  }

  scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}

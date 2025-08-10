import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/api/chat.service';
import { AuthService } from '../../../services/auth/auth.service';
import { MessageBubbleComponent } from '../../ui/message-bubble/message-bubble.component';
import { MessageInputComponent } from '../../ui/message-input/message-input.component';
import { Message } from '../../../models/message';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent, MessageInputComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private subscriptions: Subscription[] = [];

  currentChatId: string | null = null;
  messages: Message[] = [];
  contactName = '';
  loading = false;
  sendingMessage = false;
  currentUser: any;

  ngOnInit() {
    this.subscriptions.push(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
      })
    );

    this.subscriptions.push(
      this.chatService.currentChat$.subscribe((chatId) => {
        this.currentChatId = chatId;
        if (chatId) {
          this.loadMessages(chatId);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadMessages(waId: string) {
    this.loading = true;
    this.messages = [];

    this.chatService.getMessages(waId).subscribe({
      next: (response) => {
        if (response.success) {
          this.messages = response.data.messages;
          // Set contact name from the first message or use phone number
          if (this.messages.length > 0) {
            this.contactName = this.messages[0].contact_name || waId;
          } else {
            this.contactName = waId;
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loading = false;
      },
    });
  }

  onMessageSent(messageText: string) {
    if (!this.currentChatId || !messageText.trim() || this.sendingMessage) {
      return;
    }

    this.sendingMessage = true;

    const messageData = {
      from_username: this.currentUser.username,
      to: this.currentChatId,
      message: messageText.trim(),
      contact_name: this.contactName,
    };

    this.chatService.sendMessage(messageData).subscribe({
      next: (response) => {
        if (response.success) {
          // Add the new message to the list
          this.messages.push(response.data);
          this.scrollToBottom();
        }
        this.sendingMessage = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.sendingMessage = false;
      },
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      try {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      } catch (err) {}
    }
  }

  getContactInitials(): string {
    if (this.contactName) {
      return this.contactName.charAt(0).toUpperCase();
    }
    return this.currentChatId?.charAt(0) || '?';
  }

  trackByMessage(index: number, message: Message): string {
    return message.message_id;
  }
}

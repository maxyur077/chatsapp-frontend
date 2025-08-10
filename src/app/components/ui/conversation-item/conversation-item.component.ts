import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Conversation } from '../../../models/conversation';

@Component({
  selector: 'app-conversation-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conversation-item.component.html',
  styleUrls: ['./conversation-item.component.css'],
})
export class ConversationItemComponent {
  @Input() conversation!: Conversation;
  @Input() isSelected = false;
  @Output() conversationClick = new EventEmitter<Conversation>();

  onConversationClick() {
    this.conversationClick.emit(this.conversation);
  }

  getInitials(): string {
    if (this.conversation?.contact_name) {
      return this.conversation.contact_name.charAt(0).toUpperCase();
    }
    return this.conversation?.wa_id?.charAt(0) || '?';
  }

  // Fix the formatTime method to handle undefined values
  formatTime(timestamp: Date | string | undefined): string {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }
}

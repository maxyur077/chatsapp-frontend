import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../../models/message';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.css'],
})
export class MessageBubbleComponent {
  @Input() message!: Message;
  @Input() showSenderName = false;

  formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  getStatusIcon(): string {
    switch (this.message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '✗';
      default:
        return '';
    }
  }

  getStatusColor(): string {
    switch (this.message.status) {
      case 'read':
        return 'text-blue-500';
      case 'delivered':
        return 'text-gray-500';
      case 'sent':
        return 'text-gray-400';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  }
}

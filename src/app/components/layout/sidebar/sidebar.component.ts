import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/api/chat.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ConversationItemComponent } from '../../ui/conversation-item/conversation-item.component';
import { Conversation } from '../../../models/conversation';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, ConversationItemComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  searchQuery = '';
  currentUser: any;
  loading = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    this.loadConversations();
  }

  loadConversations() {
    this.loading = true;
    this.chatService.getConversations().subscribe({
      next: (response) => {
        if (response.success) {
          this.conversations = response.data.conversations;
          this.filteredConversations = [...this.conversations];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
        this.loading = false;
      },
    });
  }

  selectConversation(conversation: Conversation) {
    this.selectedConversation = conversation;
    this.chatService.setCurrentChat(conversation.wa_id);
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = [...this.conversations];
    } else {
      this.filteredConversations = this.conversations.filter(
        (conv) =>
          conv.contact_name
            ?.toLowerCase()
            .includes(this.searchQuery.toLowerCase()) ||
          conv.wa_id.includes(this.searchQuery) ||
          conv.last_message?.content
            ?.toLowerCase()
            .includes(this.searchQuery.toLowerCase())
      );
    }
  }

  logout() {
    this.authService.logout();
  }

  trackByConversation(index: number, conversation: Conversation): string {
    return conversation.wa_id;
  }
}

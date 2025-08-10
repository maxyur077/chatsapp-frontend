export interface Conversation {
  _id: string;
  wa_id: string;
  contact_name?: string;
  last_message?: {
    content?: string;
    timestamp?: Date | string;
    direction?: 'inbound' | 'outbound';
  };
  unread_count: number;
  status: 'active' | 'archived' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

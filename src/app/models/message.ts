export interface Message {
  _id: string;
  wa_id: string;
  message_id: string;
  from: string;
  to: string;
  type: 'text';
  content: {
    text: string;
  };
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'inbound' | 'outbound';
  contact_name?: string;
  sender_username?: string;
}

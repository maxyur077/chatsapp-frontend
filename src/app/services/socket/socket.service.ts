import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

interface SocketMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  status: string;
  senderName: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private authService = inject(AuthService);
  private socket: Socket | null = null;
  private messagesSubject = new BehaviorSubject<SocketMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private isConnected = false;

  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(environment.apiUrl, {
      forceNew: true,
      reconnection: true,
      timeout: 60000,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server:', this.socket?.id);
      this.isConnected = true;

      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        this.socket?.emit('join-user', currentUser.username);
        console.log('✅ Joined room:', currentUser.username);
      }
    });

    this.socket.on('new-message', (message: SocketMessage) => {
      console.log('📨 Received new message:', message);

      const processedMessage = {
        ...message,
        content:
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content),
        timestamp: new Date(message.timestamp),
      };

      this.messagesSubject.next([processedMessage]);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getNewMessages(): Observable<SocketMessage[]> {
    return this.messages$;
  }

  clearMessages() {
    this.messagesSubject.next([]);
  }
}

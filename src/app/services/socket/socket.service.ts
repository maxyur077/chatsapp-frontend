import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;
  private readonly uri = environment.socketUrl;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private onlineUsersSubject = new BehaviorSubject<string[]>([]);

  connect() {
    const token = localStorage.getItem('token');

    if (!token) {
      this.connectedSubject.next(false);
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.uri, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      this.connectedSubject.next(true);
    });

    this.socket.on('connect_error', (error: any) => {
      this.connectedSubject.next(false);

      if (
        error.message === 'Authentication required' ||
        error.message === 'Invalid authentication token'
      ) {
        this.handleAuthenticationError();
      }
    });

    this.socket.on('disconnect', () => {
      this.connectedSubject.next(false);
    });

    this.socket.on('error', (error: any) => {
      if (error.message?.includes('Unauthorized')) {
        this.handleAuthenticationError();
      }
    });

    this.socket.on('online-users', (users: string[]) => {
      this.onlineUsersSubject.next(users);
    });

    this.socket.on('user-online', (data: any) => {
      if (data.onlineUsers) {
        this.onlineUsersSubject.next(data.onlineUsers);
      }
    });

    this.socket.on('user-offline', (data: any) => {
      if (data.onlineUsers) {
        this.onlineUsersSubject.next(data.onlineUsers);
      }
    });
  }

  private handleAuthenticationError() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  joinUser(username: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-user', username);
    }
  }

  sendMessage(messageData: any) {
    if (this.socket?.connected) {
      this.socket.emit('send-message', messageData);
    }
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectedSubject.asObservable();
  }

  getOnlineUsers(): Observable<string[]> {
    return this.onlineUsersSubject.asObservable();
  }

  getNewMessages(): Observable<any> {
    return new Observable((observer) => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('newMessage', (data) => {
        observer.next([data]);
      });

      this.socket.on('message', (data) => {
        observer.next([data]);
      });

      return () => {
        if (this.socket) {
          this.socket.off('newMessage');
          this.socket.off('message');
        }
      };
    });
  }

  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ADDED: The missing getSocketDebugInfo method
  getSocketDebugInfo() {
    if (!this.socket) {
      return {
        exists: false,
        connected: false,
        id: null,
        transport: null,
      };
    }

    let transport = 'unknown';
    try {
      if (this.socket.io?.engine?.transport) {
        transport = this.socket.io.engine.transport.name || 'unknown';
      }
    } catch {
      transport = 'unknown';
    }

    return {
      exists: true,
      connected: this.socket.connected,
      id: this.socket.id,
      transport: transport,
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.connectedSubject.next(false);
  }
}

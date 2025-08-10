import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private currentChatSubject = new BehaviorSubject<string | null>(null);
  public currentChat$ = this.currentChatSubject.asObservable();

  getConversations(page: number = 1, limit: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get(`${this.apiUrl}/conversations`, { params });
  }

  getMessages(
    waId: string,
    page: number = 1,
    limit: number = 50
  ): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get(`${this.apiUrl}/messages/${waId}`, { params });
  }

  sendMessage(messageData: {
    from_username: string;
    to: string;
    message: string;
    contact_name?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages`, messageData);
  }

  searchMessages(
    waId: string,
    query: string,
    page: number = 1
  ): Observable<any> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString());

    return this.http.get(`${this.apiUrl}/messages/${waId}/search`, { params });
  }

  setCurrentChat(waId: string) {
    this.currentChatSubject.next(waId);
  }

  getCurrentChat(): string | null {
    return this.currentChatSubject.value;
  }
}

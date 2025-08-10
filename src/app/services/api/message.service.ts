import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SendMessageRequest {
  from_username: string;
  to: string;
  message: string;
  contact_name?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  data: {
    message_id: string;
    from: string;
    to: string;
    content: { text: string };
    timestamp: Date;
    status: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private http = inject(HttpClient);

  sendMessage(
    messageData: SendMessageRequest
  ): Observable<SendMessageResponse> {
    return this.http
      .post<SendMessageResponse>(`${environment.apiUrl}/messages`, messageData)
      .pipe(catchError(this.handleError));
  }

  getMessages(wa_id: string, page = 1, limit = 50): Observable<any> {
    return this.http
      .get(
        `${environment.apiUrl}/messages/${wa_id}?page=${page}&limit=${limit}`
      )
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed';
      } else {
        errorMessage = `Error: ${error.status}`;
      }
    }

    return throwError(() => errorMessage);
  }
}

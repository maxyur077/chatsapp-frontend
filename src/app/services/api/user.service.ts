import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  isOnline?: boolean;
  lastSeen?: Date;
  avatar?: string;
  createdAt: Date;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  getAllUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${environment.apiUrl}/users`);
  }

  getUserByUsername(username: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/users/${username}`);
  }

  updateUsersList(users: User[]) {
    this.usersSubject.next(users);
  }

  getCurrentUsers(): User[] {
    return this.usersSubject.value;
  }

  simulateOnlineStatus(users: User[]): User[] {
    return users.map((user) => ({
      ...user,
      isOnline: Math.random() > 0.5,
      lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    }));
  }
}

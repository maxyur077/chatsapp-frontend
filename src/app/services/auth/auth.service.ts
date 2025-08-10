import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    username: string;
    name: string;
    email: string;
    phone: string;
    token: string;
    createdAt?: Date;
    loginAt?: Date;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = 'authToken';
  private userKey = 'currentUser';

  constructor() {
    if (this.isBrowser) {
      this.loadUserFromStorage();
    }
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(this.userKey);
      const token = localStorage.getItem(this.tokenKey);

      if (storedUser && token) {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  register(userData: {
    username: string;
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Observable<AuthResponse> {
    return new Observable((observer) => {
      this.http
        .post<AuthResponse>(`${environment.apiUrl}/users/register`, userData)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.setAuthData(response.data);
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            observer.error(this.handleError(error));
          },
        });
    });
  }

  login(credentials: {
    username: string;
    password: string;
  }): Observable<AuthResponse> {
    return new Observable((observer) => {
      this.http
        .post<AuthResponse>(`${environment.apiUrl}/users/login`, credentials)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.setAuthData(response.data);
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            observer.error(this.handleError(error));
          },
        });
    });
  }

  private setAuthData(userData: any): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(this.tokenKey, userData.token);
        localStorage.setItem(this.userKey, JSON.stringify(userData));
        this.currentUserSubject.next(userData);
      } catch (error) {
        console.error('Error storing auth data:', error);
      }
    }
  }

  logout(): void {
    this.clearStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (this.isBrowser) {
      try {
        return localStorage.getItem(this.tokenKey);
      } catch (error) {
        console.error('Error getting token:', error);
        return null;
      }
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value && !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private handleError(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return `Error: ${error.error.message}`;
    } else {
      if (error.error && error.error.message) {
        return error.error.message;
      }
      return `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
  }
}

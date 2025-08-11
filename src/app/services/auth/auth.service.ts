import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
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
    user?: any; // Backend might wrap user data
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

  private tokenKey = 'token';
  private userKey = 'user';

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
        // Validate required user properties
        if (user.username && user.name && user.email) {
          this.currentUserSubject.next(user);
        } else {
          this.clearStorage();
        }
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
            if (response.success && response.data) {
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
            if (response.success && response.data) {
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

  // FIXED: Proper user object creation that matches User interface
  private setAuthData(userData: any): void {
    if (this.isBrowser) {
      try {
        // Handle case where user data might be nested
        const userInfo = userData.user || userData;

        // Validate required fields
        if (!userData.token || !userInfo.username || !userInfo.name) {
          throw new Error('Invalid user data received');
        }

        // Store token
        localStorage.setItem(this.tokenKey, userData.token);

        // Create user object that matches User interface exactly
        const user: User = {
          _id: userInfo._id || userInfo.id || userInfo.username,
          id: userInfo.id || userInfo._id,
          username: userInfo.username,
          name: userInfo.name,
          email: userInfo.email,
          phone: userInfo.phone,
          createdAt: userInfo.createdAt
            ? new Date(userInfo.createdAt)
            : undefined,
          loginAt: userInfo.loginAt ? new Date(userInfo.loginAt) : new Date(),
          updatedAt: userInfo.updatedAt
            ? new Date(userInfo.updatedAt)
            : new Date(),
        };

        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error storing auth data:', error);
        this.clearStorage();
        throw error;
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
    if (!this.isBrowser) return false;

    const token = this.getToken();
    const user = this.currentUserSubject.value;

    return !!(token && user && user.username && user.name);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  refreshUserData(): void {
    if (this.isBrowser) {
      this.loadUserFromStorage();
    }
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  }

  private handleError(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return `Network error: ${error.error.message}`;
    } else {
      if (error.error && error.error.message) {
        return error.error.message;
      }
      return `Server error: ${error.status} - ${
        error.message || 'Unknown error'
      }`;
    }
  }
}

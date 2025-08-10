import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  console.log('🔍 Interceptor - Token:', token ? 'Present' : 'Missing');
  console.log('🔍 Interceptor - Request URL:', req.url);

  // Skip auth for login and register requests
  if (req.url.includes('/login') || req.url.includes('/register')) {
    console.log('📝 Skipping auth for:', req.url);
    return next(req);
  }

  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('✅ Added Authorization header with Bearer token');
    return next(authReq);
  } else {
    console.log('❌ No token available for request');
    return next(req);
  }
};

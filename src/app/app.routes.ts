import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/pages/home/home.component').then(
        (m) => m.HomeComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'chat/:userId',
    loadComponent: () =>
      import('./components/chat/chat.component/chat.component').then(
        (m) => m.ChatComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/pages/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/pages/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

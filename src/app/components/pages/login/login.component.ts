import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Using signals for reactive state management
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  formData = {
    username: '',
    password: '',
  };

  onSubmit() {
    if (!this.formData.username.trim() || !this.formData.password) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService
      .login({
        username: this.formData.username.trim(),
        password: this.formData.password,
      })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/']);
          } else {
            this.error.set(response.message || 'Login failed');
          }
          this.loading.set(false);
        },
        error: (errorMsg: string) => {
          this.error.set(errorMsg);
          this.loading.set(false);
        },
      });
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}

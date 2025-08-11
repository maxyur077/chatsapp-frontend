import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Using signals for reactive state management
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  currentStep = signal(1);
  formSubmitted = signal(false);

  formData = {
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  };

  // Validation states
  validation = {
    username: { valid: true, message: '' }, // Start as valid to prevent initial errors
    name: { valid: true, message: '' },
    email: { valid: true, message: '' },
    phone: { valid: true, message: '' },
    password: { valid: true, message: '' },
    confirmPassword: { valid: true, message: '' },
  };

  // Track which fields have been touched/interacted with
  touched = {
    username: false,
    name: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  };

  // Mark field as touched when user interacts with it
  markFieldTouched(field: string) {
    (this.touched as any)[field] = true;
    this.validateField(field);
  }

  validateField(field: string) {
    switch (field) {
      case 'username':
        const username = this.formData.username.trim();
        if (!username) {
          this.validation.username = {
            valid: false,
            message: 'Username is required',
          };
        } else if (username.length < 3) {
          this.validation.username = {
            valid: false,
            message: 'Username must be at least 3 characters',
          };
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          this.validation.username = {
            valid: false,
            message:
              'Username can only contain letters, numbers, and underscores',
          };
        } else {
          this.validation.username = { valid: true, message: '' };
        }
        break;

      case 'name':
        const name = this.formData.name.trim();
        if (!name) {
          this.validation.name = { valid: false, message: 'Name is required' };
        } else if (name.length < 2) {
          this.validation.name = {
            valid: false,
            message: 'Name must be at least 2 characters',
          };
        } else {
          this.validation.name = { valid: true, message: '' };
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!this.formData.email) {
          this.validation.email = {
            valid: false,
            message: 'Email is required',
          };
        } else if (!emailRegex.test(this.formData.email)) {
          this.validation.email = {
            valid: false,
            message: 'Please enter a valid email address',
          };
        } else {
          this.validation.email = { valid: true, message: '' };
        }
        break;

      case 'phone':
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!this.formData.phone) {
          this.validation.phone = {
            valid: false,
            message: 'Phone number is required',
          };
        } else if (!phoneRegex.test(this.formData.phone)) {
          this.validation.phone = {
            valid: false,
            message: 'Please enter a valid phone number',
          };
        } else {
          this.validation.phone = { valid: true, message: '' };
        }
        break;

      case 'password':
        const password = this.formData.password;
        if (!password) {
          this.validation.password = {
            valid: false,
            message: 'Password is required',
          };
        } else if (password.length < 6) {
          this.validation.password = {
            valid: false,
            message: 'Password must be at least 6 characters',
          };
        } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
          this.validation.password = {
            valid: false,
            message: 'Password must contain at least one letter and one number',
          };
        } else {
          this.validation.password = { valid: true, message: '' };
        }
        break;

      case 'confirmPassword':
        if (!this.formData.confirmPassword) {
          this.validation.confirmPassword = {
            valid: false,
            message: 'Please confirm your password',
          };
        } else if (this.formData.password !== this.formData.confirmPassword) {
          this.validation.confirmPassword = {
            valid: false,
            message: 'Passwords do not match',
          };
        } else {
          this.validation.confirmPassword = { valid: true, message: '' };
        }
        break;
    }
  }

  // Check if error should be shown (only if touched or form submitted)
  shouldShowError(field: string): boolean {
    return (
      (this.touched as any)[field] &&
      this.formSubmitted() &&
      !(this.validation as any)[field].valid &&
      (this.validation as any)[field].message
    );
  }

  // Step validation methods
  canProceedFromStep1(): boolean {
    this.markFieldTouched('username');
    this.markFieldTouched('name');
    return this.validation.username.valid && this.validation.name.valid;
  }

  canProceedFromStep2(): boolean {
    this.markFieldTouched('email');
    this.markFieldTouched('phone');
    return this.validation.email.valid && this.validation.phone.valid;
  }

  canSubmit(): boolean {
    this.markFieldTouched('password');
    this.markFieldTouched('confirmPassword');
    return (
      this.validation.password.valid && this.validation.confirmPassword.valid
    );
  }

  nextStep() {
    this.error.set('');

    if (this.currentStep() === 1 && this.canProceedFromStep1()) {
      this.currentStep.set(2);
    } else if (this.currentStep() === 2 && this.canProceedFromStep2()) {
      this.currentStep.set(3);
    }
  }

  prevStep() {
    this.error.set('');

    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  onSubmit() {
    this.formSubmitted.set(true);

    // Mark all fields as touched for validation
    Object.keys(this.touched).forEach((field) => {
      (this.touched as any)[field] = true;
      this.validateField(field);
    });

    if (!this.canSubmit()) {
      this.error.set('Please fix all validation errors');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { confirmPassword, ...registrationData } = this.formData;

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/']);
        } else {
          this.error.set(response.message || 'Registration failed');
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

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

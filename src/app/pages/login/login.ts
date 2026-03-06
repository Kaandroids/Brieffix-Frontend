/**
 * @file login.ts
 * @description Standalone component that implements the user login flow.
 *
 * Renders a reactive login form with client-side validation and delegates
 * credential submission to `AuthService`. On success the user is redirected
 * to `/dashboard`; on failure a server-supplied or fallback error message is
 * displayed. The loading signal prevents duplicate submissions while the HTTP
 * request is in flight.
 */

import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';

const GOOGLE_CLIENT_ID = '919868109325-309ch5gbdf10onbpatqabulqbc7gc22a.apps.googleusercontent.com';

/**
 * Standalone page component responsible for authenticating an existing user.
 *
 * Implements `OnInit` to set the document title on activation, ensuring the
 * browser tab accurately reflects the current page regardless of navigation order.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private title = inject(Title);
  private platformId = inject(PLATFORM_ID);

  googleError = signal('');

  ngOnInit(): void {
    this.title.setTitle('Login — Brief-Fix');
    if (isPlatformBrowser(this.platformId)) {
      this.initGoogleSignIn();
    }
  }

  private initGoogleSignIn(): void {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => this.handleGoogleCredential(response.credential),
      auto_select: false
    });
  }

  signInWithGoogle(): void {
    google.accounts.id.prompt();
  }

  private handleGoogleCredential(idToken: string): void {
    this.googleError.set('');
    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => this.googleError.set(err.error?.detail ?? 'Google-Anmeldung fehlgeschlagen.')
    });
  }

  /** Tracks whether an authentication request is currently in progress; prevents re-submission. */
  loading = signal(false);

  /** Controls password field visibility toggling in the template. */
  showPassword = signal(false);

  /**
   * Holds the most recent authentication error message for display in the template.
   * Reset to an empty string at the start of each new submission attempt.
   */
  errorMessage = signal('');

  /**
   * Reactive login form with field-level validation.
   *
   * - `email`    — Required; must satisfy RFC-compliant email format.
   * - `password` — Required; minimum 8 characters to match server-side constraints.
   */
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  /** Convenience accessor for the email `AbstractControl` used in template error bindings. */
  get email() { return this.form.get('email')!; }

  /** Convenience accessor for the password `AbstractControl` used in template error bindings. */
  get password() { return this.form.get('password')!; }

  /**
   * Handles form submission: validates locally, then delegates to `AuthService.login`.
   *
   * If the form is invalid, all controls are marked as touched so that validation
   * error messages become visible without waiting for the user to blur each field.
   * The loading flag is only reset on error — on success, the navigation to
   * `/dashboard` naturally destroys this component.
   */
  onSubmit() {
    if (this.form.invalid) {
      // Surface validation errors for all untouched fields simultaneously.
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login({
      email: this.email.value!,
      password: this.password.value!
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403) {
          this.router.navigate(['/check-email'], { queryParams: { email: this.email.value } });
        } else {
          this.errorMessage.set(err.error?.detail ?? 'Ungültige E-Mail oder Passwort.');
        }
      }
    });
  }
}

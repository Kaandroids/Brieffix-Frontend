/**
 * @file register.ts
 * @description Standalone component that implements the new user registration flow.
 *
 * Renders a multi-field reactive form with client-side validation including a
 * cross-field password confirmation check. On successful registration the user is
 * redirected to `/login` rather than `/dashboard`, requiring an explicit login step
 * (e.g. to allow email verification to complete first). On failure a server-supplied
 * or fallback error message is displayed.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';

/**
 * Cross-field form-group validator that ensures the `password` and
 * `confirmPassword` controls contain identical values.
 *
 * Applied at the `FormGroup` level (not per-control) so that the error is
 * attached to the group itself and can be surfaced independently of individual
 * field touch state.
 *
 * @param control - The parent `FormGroup` containing both password controls.
 * @returns A `ValidationErrors` object with key `passwordMismatch` when the values
 *          differ; `null` when they match or when either field is still empty.
 */
function passwordMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

/**
 * Standalone page component responsible for creating a new user account.
 *
 * Implements `OnInit` to set the document title on activation. The `confirmPassword`
 * field is not sent to the API — it exists solely for client-side equality validation.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private title = inject(Title);

  ngOnInit(): void {
    this.title.setTitle('Register — Brief-Fix');
  }

  /** Tracks whether a registration request is currently in progress; prevents re-submission. */
  loading = signal(false);

  /** Controls primary password field visibility toggling in the template. */
  showPassword = signal(false);

  /** Controls confirmation password field visibility toggling in the template. */
  showConfirm = signal(false);

  /**
   * Holds the most recent registration error message for display in the template.
   * Reset to an empty string at the start of each new submission attempt.
   */
  errorMessage = signal('');

  /**
   * Reactive registration form with field-level and group-level validation.
   *
   * - `fullName`        — Required; minimum 2 characters.
   * - `email`           — Required; must satisfy RFC-compliant email format.
   * - `password`        — Required; minimum 8 characters.
   * - `confirmPassword` — Required; must match `password` (enforced by `passwordMatch`).
   *
   * The `passwordMatch` validator is registered on the group so it fires after
   * both controls have been evaluated, producing a `passwordMismatch` group error.
   */
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatch });

  /** Convenience accessor for the fullName `AbstractControl` used in template error bindings. */
  get fullName() { return this.form.get('fullName')!; }

  /** Convenience accessor for the email `AbstractControl` used in template error bindings. */
  get email() { return this.form.get('email')!; }

  /** Convenience accessor for the password `AbstractControl` used in template error bindings. */
  get password() { return this.form.get('password')!; }

  /** Convenience accessor for the confirmPassword `AbstractControl` used in template error bindings. */
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  /**
   * Handles form submission: validates locally, then delegates to `AuthService.register`.
   *
   * If the form is invalid (including the group-level `passwordMismatch` error), all
   * controls are marked as touched so that validation messages become visible immediately.
   * `confirmPassword` is intentionally excluded from the API payload — the server only
   * needs the authoritative password value.
   * The loading flag is only reset on error; on success, the navigation to `/login`
   * destroys this component naturally.
   */
  onSubmit() {
    if (this.form.invalid) {
      // Surface validation errors for all untouched fields simultaneously.
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      fullName: this.fullName.value!,
      email: this.email.value!,
      password: this.password.value!
    }).subscribe({
      next: () => this.router.navigate(['/check-email'], { queryParams: { email: this.email.value } }),
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.detail ?? err.error?.message ?? 'Registration failed. Please try again.');
      }
    });
  }
}

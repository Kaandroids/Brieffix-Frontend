/**
 * @file check-email.ts
 * @description Standalone component shown after successful registration,
 * prompting the user to check their inbox for a verification email.
 *
 * Activated at `/check-email` with an optional `email` query parameter
 * (set by the register and login flows). When present, the email address
 * is displayed in the template and used as the target for resend requests.
 *
 * Provides a "Resend" action that calls `AuthService.resendVerification`,
 * with independent loading, success, and error signals to drive the
 * button state and feedback messages without complex conditional logic.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';
import { BgOrbs } from '../../components/bg-orbs/bg-orbs';

/**
 * Standalone page component that guides the user through the post-registration
 * email verification step.
 *
 * The component reads the `email` query parameter on init so that this route
 * can be navigated to both from the registration success path and from the
 * login error path (HTTP 403 — unverified account).
 */
@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, RouterLink, BgOrbs],
  templateUrl: './check-email.html',
  styleUrl: './check-email.scss'
})
export class CheckEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private title = inject(Title);

  /**
   * The email address extracted from the `email` query parameter.
   * Displayed in the template and passed to the resend API call.
   * Defaults to an empty string if the parameter is absent.
   */
  email = signal('');

  /** Tracks whether a resend request is in flight; disables the resend button. */
  resendLoading = signal(false);

  /** Set to `true` after a successful resend to display a confirmation message. */
  resendSuccess = signal(false);

  /** Holds any error message returned by the resend API call. */
  resendError = signal('');

  /**
   * Sets the page title and reads the `email` query parameter from the route snapshot.
   */
  ngOnInit(): void {
    this.title.setTitle('E-Mail bestätigen — Brief-Fix');
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
  }

  /**
   * Triggers a resend of the email verification message to the stored address.
   *
   * Guards against concurrent requests via the `resendLoading` signal and
   * against missing email via an early return. Feedback signals (`resendSuccess`,
   * `resendError`) are mutually exclusive: both are reset before each attempt.
   */
  resend(): void {
    if (!this.email() || this.resendLoading()) return;
    this.resendLoading.set(true);
    this.resendError.set('');
    this.resendSuccess.set(false);

    this.authService.resendVerification(this.email()).subscribe({
      next: () => {
        this.resendLoading.set(false);
        this.resendSuccess.set(true);
      },
      error: () => {
        this.resendLoading.set(false);
        this.resendError.set('E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
      }
    });
  }
}

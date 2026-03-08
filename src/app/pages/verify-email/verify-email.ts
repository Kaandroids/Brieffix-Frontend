/**
 * @file verify-email.ts
 * @description Standalone component that handles email verification link redemption.
 *
 * Activated at `/verify-email` by the link included in the account verification
 * email. The `token` query parameter is extracted from the URL and submitted
 * to `AuthService.verifyEmail` on component initialisation.
 *
 * Renders one of three states driven by the `status` signal:
 * - `'loading'` — request in flight; spinner or skeleton displayed.
 * - `'success'` — token accepted; user is prompted to proceed to login.
 * - `'error'`   — token missing, expired, or already consumed; user is
 *                 prompted to request a new verification email.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';

/**
 * Standalone page component that completes the email verification flow.
 *
 * The component is intentionally stateless beyond the `status` signal —
 * once the token has been submitted, no further user interaction is required
 * other than navigating to login.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private title = inject(Title);

  /**
   * Reactive signal representing the current verification state.
   * Starts as `'loading'` and transitions to either `'success'` or `'error'`
   * based on the API response. The template switches its content based on this value.
   */
  status = signal<'loading' | 'success' | 'error'>('loading');

  /**
   * Sets the page title, reads the `token` query parameter, and immediately
   * submits it to the verification endpoint.
   *
   * If no token is present in the URL (e.g. the user navigated here directly),
   * the status is set to `'error'` without making an API call.
   */
  ngOnInit(): void {
    this.title.setTitle('E-Mail bestätigen — Brief-Fix');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error')
    });
  }
}

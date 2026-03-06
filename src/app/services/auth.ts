/**
 * @file auth.ts
 * @description Authentication service for the Briefix application.
 *
 * Centralises all authentication state and API interactions: registration, login,
 * logout, session persistence, and reactive login-status derivation. The service
 * is provided at the root level and is therefore a singleton throughout the
 * application's lifetime.
 *
 * Token storage strategy:
 * - Both `accessToken` and `refreshToken` are persisted in `localStorage` so that
 *   authenticated sessions survive page reloads.
 * - The `accessToken` is additionally tracked in an Angular `signal` so that
 *   computed values (e.g. `isLoggedIn`) remain reactive to in-session changes such
 *   as logout or token refresh without requiring external event buses.
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

/**
 * Payload shape for the account registration endpoint.
 *
 * @property email    - The user's email address; used as the unique login identifier.
 * @property password - Plaintext password transmitted over HTTPS; hashed server-side.
 * @property fullName - Display name stored on the user record.
 * @property phone    - Optional contact telephone number.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

/**
 * Payload shape for the login endpoint.
 *
 * @property email    - The registered email address.
 * @property password - The account password.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Shape of the token pair returned by both login and registration endpoints.
 *
 * @property accessToken  - Short-lived JWT used to authenticate API requests via
 *                          the `authInterceptor`. Expiry is encoded in the token's
 *                          `exp` claim and validated client-side.
 * @property refreshToken - Longer-lived token intended for session renewal;
 *                          persisted in `localStorage` for future use.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Root-provided singleton service responsible for user authentication lifecycle.
 *
 * Responsibilities:
 * - Exposing a reactive `isLoggedIn` computed signal derived from the stored JWT's
 *   expiry claim, allowing any component to subscribe to auth state without polling.
 * - Persisting and clearing tokens from both `localStorage` and the in-memory signal
 *   atomically to prevent state drift between storage and reactive layer.
 * - Delegating navigation after logout so that components are not tightly coupled
 *   to routing decisions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Base URL prefix for all authentication API endpoints. */
  private readonly base = '/api/v1/auth';

  private http = inject(HttpClient);
  private router = inject(Router);

  /**
   * Reactive signal holding the current access token value.
   * Initialised from `localStorage` on service construction to restore
   * an existing session across page reloads without an explicit login.
   */
  private accessToken = signal<string | null>(localStorage.getItem('accessToken'));

  /**
   * Derived computed signal that reflects whether the user currently holds a
   * valid (present and non-expired) access token.
   *
   * Re-evaluates automatically whenever `accessToken` changes, making it safe
   * to bind directly in templates or derive further computed values from it.
   */
  isLoggedIn = computed(() => this.isTokenValid(this.accessToken()));

  /**
   * Validates a JWT string by decoding its payload and comparing the `exp` claim
   * against the current timestamp. Does not perform signature verification — that
   * responsibility belongs to the API server.
   *
   * @param token - The raw JWT string to validate, or `null` if absent.
   * @returns `true` if the token is present and has not yet expired; `false` otherwise.
   */
  private isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      // Extract and base64-decode the JWT payload (middle segment).
      const payload = JSON.parse(atob(token.split('.')[1]));
      // JWT `exp` is in seconds; multiply by 1000 to compare with `Date.now()` in ms.
      return payload.exp * 1000 > Date.now();
    } catch {
      // Any parsing error (malformed token, invalid base64) is treated as invalid.
      return false;
    }
  }

  /**
   * Registers a new user account and persists the returned token pair on success.
   *
   * The `tap` operator stores tokens as a side effect within the observable pipeline,
   * ensuring that the caller's subscription receives the full `AuthResponse` while
   * the service simultaneously updates its internal state.
   *
   * @param payload - Registration details for the new account.
   * @returns Observable that emits the server-issued token pair on success.
   */
  register(payload: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/register`, payload, { responseType: 'text' as 'json' });
  }

  verifyEmail(token: string): Observable<void> {
    return this.http.get<void>(`${this.base}/verify`, { params: { token }, responseType: 'text' as 'json' });
  }

  resendVerification(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/resend-verification`, { email }, { responseType: 'text' as 'json' });
  }

  /**
   * Authenticates an existing user and persists the returned token pair on success.
   *
   * @param payload - Login credentials.
   * @returns Observable that emits the server-issued token pair on success.
   */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, payload).pipe(
      tap(res => this.storeTokens(res))
    );
  }

  /**
   * Terminates the current session by clearing stored tokens and redirecting the
   * user to the login page.
   *
   * Delegates to `clearSession` so that token removal logic is not duplicated
   * between logout and the auth guard's unauthenticated-user handling.
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Removes both tokens from `localStorage` and resets the in-memory signal to
   * `null`, effectively invalidating the session on the client side.
   *
   * Exposed publicly so that the `authGuard` can purge stale session data before
   * redirecting an unauthenticated user, without triggering a full logout navigation.
   */
  clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken.set(null);
  }

  /**
   * Persists the received token pair to `localStorage` and synchronises the
   * in-memory `accessToken` signal so that `isLoggedIn` reacts immediately.
   *
   * @param res - The `AuthResponse` containing both tokens received from the API.
   */
  private storeTokens(res: AuthResponse): void {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    this.accessToken.set(res.accessToken);
  }
}

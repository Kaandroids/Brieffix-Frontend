/**
 * @file user.ts
 * @description Service responsible for fetching and caching the authenticated
 * user's own profile data.
 *
 * Provides a reactive signal (`me`) that holds the current user's DTO, making
 * user information (such as subscription plan) available reactively to any
 * component without prop-drilling or repeated HTTP calls — provided `loadMe`
 * has been called at least once during the session.
 */

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'APPLE';

/**
 * Subscription tier discriminator for the user account.
 *
 * - `STANDARD` — baseline feature set available to all accounts.
 * - `PREMIUM`  — extended feature set including additional letter templates
 *                and increased usage limits.
 */
export type UserPlan = 'STANDARD' | 'PREMIUM';

/**
 * Data Transfer Object representing the authenticated user as returned by the API.
 *
 * @property id               - Unique server-assigned user identifier (UUID).
 * @property email            - The user's login email address.
 * @property fullName         - Display name as entered during registration.
 * @property phone            - Optional contact telephone number.
 * @property plan             - The user's current subscription tier.
 * @property isEmailVerified  - Whether the user has confirmed ownership of their
 *                              email address via the verification flow.
 * @property createdAt        - ISO 8601 timestamp of account creation.
 */
export interface UserDto {
  id: string;
  email: string;
  provider: AuthProvider;
  fullName: string;
  phone?: string;
  plan: UserPlan;
  isEmailVerified: boolean;
  createdAt: string;
  billingName?: string;
  billingStreet?: string;
  billingStreetNo?: string;
  billingZip?: string;
  billingCity?: string;
  billingCountry?: string;
}

/**
 * Root-provided singleton service that manages the current user's own data.
 *
 * The `me` signal acts as a lightweight in-memory cache: once populated by
 * `loadMe`, all subscribers (e.g. `DashboardHome`, `Letters`) read from the
 * signal synchronously without triggering additional HTTP requests.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  /** Base URL prefix for user-scoped API endpoints. */
  private readonly base = '/api/v1/users';
  private http = inject(HttpClient);

  /**
   * Reactive signal holding the currently authenticated user's DTO.
   * Starts as `null` and is populated upon a successful `loadMe` call.
   * Components should treat a `null` value as "not yet loaded" rather than
   * "not logged in", as authentication state is managed by `AuthService`.
   */
  me = signal<UserDto | null>(null);

  /**
   * Fetches the authenticated user's own record from the API and updates the
   * `me` signal with the result.
   *
   * Callers are responsible for subscribing to the returned observable; the
   * signal update occurs as a `tap` side effect within the pipeline, guaranteeing
   * that `me` is updated regardless of whether the caller processes the emitted value.
   *
   * @returns Observable that emits the `UserDto` on success.
   */
  loadMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/me`).pipe(
      tap(u => this.me.set(u))
    );
  }

  updateProfile(data: { fullName: string; phone?: string }): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/me/profile`, data).pipe(
      tap(u => this.me.set(u))
    );
  }

  updatePassword(data: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.put<void>(`${this.base}/me/password`, data);
  }

  updateBilling(data: {
    billingName?: string; billingStreet?: string; billingStreetNo?: string;
    billingZip?: string; billingCity?: string; billingCountry?: string;
  }): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/me/billing`, data).pipe(
      tap(u => this.me.set(u))
    );
  }
}

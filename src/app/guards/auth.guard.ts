/**
 * @file auth.guard.ts
 * @description Route guard that enforces authentication on protected routes.
 *
 * Implemented as a functional `CanActivateFn` to align with the Angular
 * standalone / inject-based API and to remain tree-shakable. The guard is
 * applied at the `dashboard` route level, so all nested child routes are
 * implicitly protected without requiring per-child guard declarations.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Functional route guard that permits navigation only when the current user
 * holds a valid, non-expired JWT access token.
 *
 * Behaviour on failure:
 * - `clearSession` is called defensively before redirecting to ensure that any
 *   stale or malformed token data is purged from `localStorage` and the in-memory
 *   signal, preventing an inconsistent authentication state.
 * - Returns a `UrlTree` for `/login` rather than a plain `false` so that Angular's
 *   router performs a proper navigation instead of silently blocking the transition,
 *   which guarantees the browser URL and router state remain in sync.
 *
 * @returns `true` when the user is authenticated; a `UrlTree` redirecting to
 *          `/login` otherwise.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  // Purge any residual session data before redirecting to prevent the guard from
  // being bypassed by a token that has expired but not yet been cleared.
  auth.clearSession();
  return router.createUrlTree(['/login']);
};

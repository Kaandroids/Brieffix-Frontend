/**
 * @file auth.interceptor.ts
 * @description HTTP interceptor that attaches the JWT Bearer token to outbound requests.
 *
 * Implemented as a functional `HttpInterceptorFn` (Angular 15+) and registered
 * globally via `withInterceptors` in `app.config.ts`. This avoids the need for a
 * class-based interceptor and keeps the token-attachment logic co-located and
 * independently testable.
 *
 * The interceptor reads the access token from `localStorage` on every request
 * rather than caching it at construction time, ensuring that a token stored after
 * initial page load (e.g. after login) is picked up without requiring a page refresh.
 *
 * Requests without a stored token are forwarded unmodified — this covers unauthenticated
 * endpoints such as `/auth/login` and `/auth/register`.
 */

import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Functional HTTP interceptor that injects a `Bearer` Authorization header into
 * every outbound `HttpRequest` when an access token is present in `localStorage`.
 *
 * The original request object is immutable; `req.clone` is used to produce a new
 * request with the additional header, leaving the original unchanged per Angular's
 * interceptor contract.
 *
 * @param req  - The outgoing HTTP request.
 * @param next - The next handler in the interceptor chain.
 * @returns The observable response stream, either from the cloned (authenticated)
 *          request or from the original request if no token is available.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    // Clone the request to attach the Authorization header; the original `req`
    // object is immutable and must not be mutated directly.
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }
  return next(req);
};

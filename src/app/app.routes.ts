/**
 * @file app.routes.ts
 * @description Application-level route definitions for the Briefix Angular application.
 *
 * All routes are configured with lazy-loaded standalone components to minimise
 * the initial bundle size. The `dashboard` route and its children are guarded by
 * `authGuard`, which redirects unauthenticated users to `/login`.
 *
 * Route hierarchy:
 * - `/`            — Public marketing/landing page.
 * - `/login`       — Authentication entry point.
 * - `/register`    — New-account registration.
 * - `/dashboard`   — Protected shell component; renders child routes in its outlet.
 *   - (index)      — Dashboard overview / home summary.
 *   - `profiles`   — Sender profile management.
 *   - `contacts`   — Recipient contact management.
 *   - `letters`    — Letter composition and history.
 *   - `settings`   — User account and preferences.
 * - `**`           — Wildcard catch-all redirects to `/login` to prevent blank pages
 *                    for unrecognised paths.
 */

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/**
 * Top-level route configuration exported for use by `provideRouter` in `app.config.ts`.
 *
 * Each route uses dynamic `import()` so that page bundles are only fetched when
 * the user first navigates to that path. Child routes of `dashboard` inherit the
 * authentication constraint imposed by `canActivate: [authGuard]` on the parent.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)
  },
  {
    path: 'ueber-uns',
    loadComponent: () => import('./pages/ueber-uns/ueber-uns').then(m => m.UeberUns)
  },
  {
    path: 'erstellen',
    loadComponent: () => import('./pages/generate/generate').then(m => m.Generate)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register)
  },
  {
    path: 'check-email',
    loadComponent: () => import('./pages/check-email/check-email').then(m => m.CheckEmail)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./pages/verify-email/verify-email').then(m => m.VerifyEmail)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    /** Prevents access to the dashboard subtree for unauthenticated users. */
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard-home/dashboard-home').then(m => m.DashboardHome)
      },
      {
        path: 'profiles',
        loadComponent: () => import('./pages/profiles/profiles').then(m => m.Profiles)
      },
      {
        path: 'contacts',
        loadComponent: () => import('./pages/contacts/contacts').then(m => m.Contacts)
      },
      {
        path: 'letters',
        loadComponent: () => import('./pages/letters/letters').then(m => m.Letters)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then(m => m.Settings)
      }
    ]
  },
  /** Catch-all: any unmatched path is redirected to login rather than showing a 404. */
  { path: '**', redirectTo: '/login' }
];

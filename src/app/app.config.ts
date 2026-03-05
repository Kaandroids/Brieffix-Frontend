/**
 * @file app.config.ts
 * @description Root application configuration for the Briefix Angular application.
 *
 * Assembles the top-level `ApplicationConfig` object that is passed to
 * `bootstrapApplication` in `main.ts`. All framework-level providers — routing,
 * HTTP, and global error handling — are registered here, making this the single
 * authoritative source for application-wide infrastructure setup.
 *
 * Keeping providers at this level (rather than inside a root NgModule) aligns
 * with the Angular standalone-component model and ensures tree-shakable,
 * lazy-friendly dependency injection.
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

/**
 * Root `ApplicationConfig` consumed by `bootstrapApplication`.
 *
 * Providers registered here are available throughout the entire application DI
 * hierarchy. The order of providers is intentional: error listeners are set up
 * first so that failures during router or HTTP initialisation are captured.
 *
 * - `provideBrowserGlobalErrorListeners` — attaches handlers for unhandled
 *   promise rejections and uncaught errors at the browser `window` level,
 *   forwarding them to Angular's `ErrorHandler`.
 * - `provideRouter` — configures the Angular router with the application's
 *   lazy-loaded route tree defined in `app.routes.ts`.
 * - `provideHttpClient` — registers `HttpClient` with the functional
 *   `authInterceptor` applied to every outbound request, ensuring JWT
 *   attachment without the overhead of class-based interceptors.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};

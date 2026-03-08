/**
 * @file main.ts
 * @description Application bootstrap entry point for the Briefix Angular frontend.
 *
 * Calls Angular's `bootstrapApplication` with the root `App` component and the
 * centrally defined `appConfig`, which supplies all framework-level providers
 * (router, HTTP client, interceptors). Any fatal bootstrap error is forwarded
 * to `console.error` for visibility during development and CI log inspection.
 *
 * This file intentionally contains no business logic. All provider registration
 * and route configuration are delegated to `app.config.ts` and `app.routes.ts`
 * respectively, keeping the entry point minimal and environment-agnostic.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

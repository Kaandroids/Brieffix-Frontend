/**
 * @file landing.ts
 * @description Standalone component for the public-facing landing page.
 *
 * This is the entry point for unauthenticated visitors arriving at the root
 * path (`/`). Its sole structural responsibility is to provide a shell into
 * which the landing page template (`landing.html`) is rendered. All navigation
 * to authentication routes is handled declaratively via `RouterLink` directives
 * in the template, requiring no component-level logic.
 */

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Presentational component for the application's public landing page.
 *
 * Contains no business logic; its class body is intentionally empty because the
 * page is entirely template-driven. `RouterLink` is imported to enable anchor
 * navigation to `/login` and `/register` without a full page reload.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing {}

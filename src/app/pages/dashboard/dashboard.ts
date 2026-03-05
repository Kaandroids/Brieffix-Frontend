/**
 * @file dashboard.ts
 * @description Standalone shell component for the authenticated dashboard area.
 *
 * Acts as a persistent layout wrapper for all child routes under `/dashboard`.
 * It owns the application's primary navigation chrome (sidebar or top bar) and
 * renders child page components through its `<router-outlet>`. The only runtime
 * responsibility of this component is to expose a `logout` action; all navigation
 * between child routes is handled declaratively in the template via `RouterLink`
 * and `RouterLinkActive`.
 */

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';

/**
 * Layout shell component rendered for every route under `/dashboard`.
 *
 * `RouterOutlet` projects the active child route's component into the template.
 * `RouterLinkActive` provides CSS class toggling on navigation items to reflect
 * which child route is currently active, without requiring any component logic.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private authService = inject(AuthService);

  /**
   * Terminates the current user session and redirects to the login page.
   *
   * Delegates entirely to `AuthService.logout`, which clears stored tokens and
   * handles navigation, keeping this component free of direct routing concerns.
   */
  logout(): void {
    this.authService.logout();
  }
}

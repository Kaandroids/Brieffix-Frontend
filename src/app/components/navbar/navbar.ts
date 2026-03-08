/**
 * @file navbar.ts
 * @description Shared navigation bar component used on all public-facing pages.
 *
 * Renders the top navigation chrome with the Brief-Fix brand logo, desktop
 * navigation links, and a hamburger-triggered mobile drawer. The mobile drawer
 * state is managed via a `signal` so that the template binds reactively without
 * requiring `ChangeDetectorRef` calls or `@Input`/`@Output` props.
 *
 * This component is intentionally stateless beyond the menu toggle — no service
 * injection or HTTP calls are made here. Authentication-aware navigation items
 * (e.g. "Dashboard") are rendered conditionally in the template via `RouterLink`
 * and are not gated programmatically by this component.
 */

import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Standalone shared navigation bar component.
 *
 * `menuOpen` drives the mobile drawer visibility class in the template.
 * `RouterLinkActive` applies an `active` CSS class to the link whose route
 * matches the current URL, providing visual feedback for the active page.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  /**
   * Reactive signal tracking whether the mobile navigation drawer is open.
   * Toggled by the hamburger button; closed by any drawer link click or
   * an explicit overlay tap.
   */
  menuOpen = signal(false);

  /** Toggles the mobile navigation drawer open/closed. */
  toggleMenu() { this.menuOpen.update(v => !v); }

  /** Explicitly closes the mobile navigation drawer. */
  closeMenu()  { this.menuOpen.set(false); }
}

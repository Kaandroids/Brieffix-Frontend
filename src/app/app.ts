/**
 * @file app.ts
 * @description Root application component for the Briefix Angular frontend.
 *
 * Serves as the top-level host element (`<app-root>`) mounted by Angular's
 * bootstrapper. Its sole structural role is to render the active route's
 * component via `<router-outlet>`, delegating all page-level rendering to
 * lazily loaded child components defined in `app.routes.ts`.
 *
 * No business logic, HTTP calls, or reactive state should be placed here.
 * Global layout concerns that must persist across all routes (e.g. toast
 * notifications, global error overlays) may be added here as needed.
 */

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component that acts as the application shell.
 *
 * `RouterOutlet` projects the component matched by the current URL into the
 * template. The `title` signal is retained from the Angular CLI scaffold and
 * may be used for programmatic document-title management if a centralised
 * title strategy is introduced in the future.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  /** Application name signal; available for template bindings or title strategies. */
  protected readonly title = signal('frontend');
}

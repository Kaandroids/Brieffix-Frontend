/**
 * @file footer.ts
 * @description Shared footer component used across all public-facing pages.
 *
 * Renders the site-wide footer with the Brief-Fix brand logo, copyright
 * notice, and navigation links. Extracted from the individual page templates
 * (`landing`, `generate`, `ueber-uns`) into a single reusable component to
 * eliminate duplication and ensure footer changes propagate consistently.
 *
 * This component is purely presentational — it contains no reactive state,
 * service injections, or lifecycle hooks. All navigation is handled
 * declaratively via `RouterLink` directives in the template.
 */

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Standalone shared footer component.
 *
 * Intended for use on every public page by adding `Footer` to the host
 * component's `imports` array and placing `<app-footer />` in the template.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {}

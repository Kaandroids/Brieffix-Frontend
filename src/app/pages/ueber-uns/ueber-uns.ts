/**
 * @file ueber-uns.ts
 * @description Standalone component for the public "Über uns" (About us) page.
 *
 * Accessible at `/ueber-uns` without authentication. Provides brand and product
 * information to prospective users, including team details, the application's
 * mission, and calls-to-action linking to registration and letter creation.
 *
 * This component is purely structural — all content is rendered statically from
 * the template. No service injection, lifecycle hooks, or reactive state are
 * required.
 */

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

/**
 * Standalone public-facing "About" page component.
 *
 * Composed from the shared `Navbar` and `Footer` components to maintain a
 * consistent page chrome across all public pages without duplicating markup.
 */
@Component({
  selector: 'app-ueber-uns',
  standalone: true,
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './ueber-uns.html',
  styleUrl: './ueber-uns.scss'
})
export class UeberUns {}

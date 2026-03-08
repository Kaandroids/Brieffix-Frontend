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
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing {}

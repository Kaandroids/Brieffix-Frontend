/**
 * @file dashboard-home.ts
 * @description Standalone component for the dashboard overview / home page.
 *
 * Rendered at the index child route of `/dashboard`, this component provides a
 * summary view of the user's recent activity and configured sender profiles.
 * It eagerly fetches data from multiple services on initialisation so that the
 * overview is populated as soon as the route activates.
 *
 * Computed signals derive the rendered data from service state, ensuring the
 * view automatically reflects any changes made to letters or profiles during the
 * same session without requiring a page reload.
 */

import { Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user';
import { LetterService } from '../../services/letter';
import { ProfileService } from '../../services/profile';

/**
 * Dashboard home page component that surfaces key at-a-glance information:
 * the ten most recently created letters and the user's default sender profiles.
 *
 * `userService` is intentionally left public so that the template can bind to
 * `userService.me()` for personalised greeting or plan-based UI conditionals.
 */
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHome implements OnInit {
  private title = inject(Title);

  /** Publicly exposed to allow direct template bindings to the current user signal. */
  userService = inject(UserService);

  private letterService = inject(LetterService);
  private profileService = inject(ProfileService);

  /**
   * Derived computed signal yielding the ten most recently created letters,
   * sorted in descending chronological order by `createdAt`.
   *
   * The spread (`[...`)`) creates a shallow copy before sorting to avoid mutating
   * the underlying signal array, which would trigger unintended reactive updates.
   */
  recentLetters = computed(() =>
    [...this.letterService.letters()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  );

  /**
   * Derived computed signal yielding only the profiles marked as default.
   * Used to surface the user's primary sender identities prominently on the overview.
   */
  defaultProfiles = computed(() =>
    this.profileService.profiles().filter(p => p.isDefault)
  );

  /**
   * Sets the page title and triggers parallel data fetches from all three services.
   * Subscriptions are intentionally fire-and-forget; the signals update reactively
   * once each response arrives.
   */
  ngOnInit(): void {
    this.title.setTitle('Dashboard — Briefix');
    this.userService.loadMe().subscribe();
    this.letterService.loadLetters().subscribe();
    this.profileService.loadProfiles().subscribe();
  }

  /**
   * Resolves a display-friendly name for a letter's recipient from its snapshot.
   *
   * Prefers the company name for organisation recipients; falls back to a
   * space-joined first/last name, and uses an em-dash if no name data is present.
   *
   * @param letter - A letter item from the `recentLetters` computed array.
   * @returns A human-readable recipient name string.
   */
  recipientName(letter: ReturnType<typeof this.recentLetters>[number]): string {
    const r = letter.recipientSnapshot;
    if (r.companyName) return r.companyName;
    const parts = [r.firstName, r.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
  }

  /**
   * Resolves a display-friendly name for a sender profile.
   *
   * For organisation profiles, returns the company name with a fallback to the
   * profile label. For individual profiles, joins first and last name, falling
   * back to the profile label if neither name field is populated.
   *
   * @param profile - A profile item from the `defaultProfiles` computed array.
   * @returns A human-readable profile name string.
   */
  profileName(profile: ReturnType<typeof this.defaultProfiles>[number]): string {
    if (profile.type === 'ORGANIZATION') return profile.companyName ?? profile.profileLabel;
    const parts = [profile.firstName, profile.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : profile.profileLabel;
  }
}

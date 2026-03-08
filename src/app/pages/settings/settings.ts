/**
 * @file settings.ts
 * @description Standalone placeholder component for the user settings page.
 *
 * Currently renders a "Coming soon" notice while the settings feature set
 * (e.g. account details, password change, plan management, notification
 * preferences) is under development. The route `/dashboard/settings` is
 * registered and guarded by `authGuard` to ensure the URL is valid and
 * accessible to authenticated users from the dashboard navigation.
 *
 * When settings are implemented, this component should be replaced with a
 * full reactive form backed by the appropriate API endpoints and service layer.
 */

import { Component } from '@angular/core';

/**
 * Standalone settings page placeholder component.
 *
 * Uses an inline template to avoid creating empty external template and
 * style files for a feature that is not yet implemented.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div style="padding: 2.5rem">
      <h1 style="font-size:1.75rem;font-weight:700;color:#f1f5f9;letter-spacing:-0.03em;margin-bottom:0.5rem">Settings</h1>
      <p style="color:#94a3b8;font-size:0.95rem">Coming soon.</p>
    </div>
  `
})
export class Settings {}

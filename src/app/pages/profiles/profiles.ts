/**
 * @file profiles.ts
 * @description Standalone component for managing the authenticated user's sender profiles.
 *
 * Provides a full CRUD interface: listing existing profiles, creating new ones,
 * editing existing entries in a slide-over panel, and deleting profiles. The
 * component distinguishes between `INDIVIDUAL` and `ORGANIZATION` profile types,
 * conditionally surfacing organisation-specific fields (company name, VAT ID,
 * commercial register details, banking information) when the type is set accordingly.
 *
 * A single `FormGroup` is reused for both create and edit operations; the presence
 * or absence of a value in `editingProfile` determines which `ProfileService` method
 * is invoked on submission.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl, Title } from '@angular/platform-browser';
import { ProfileDto, ProfileService } from '../../services/profile';

/**
 * Standalone page component for sender profile management.
 *
 * `profiles` is a direct reference to the `ProfileService` signal, so the
 * template automatically reflects any create/update/delete operations without
 * requiring manual refresh calls.
 */
@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profiles.html',
  styleUrl: './profiles.scss'
})
export class Profiles implements OnInit {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);
  private title = inject(Title);
  private sanitizer = inject(DomSanitizer);

  /** Direct reference to the `ProfileService` reactive signal; binds the template to live data. */
  profiles = this.profileService.profiles;

  /** Controls the visibility of the create/edit side panel. */
  panelOpen = signal(false);

  /**
   * Holds the profile currently being edited, or `null` when the form is in create mode.
   * The distinction between create and edit is derived from this signal rather than a
   * separate boolean flag to keep state minimal and consistent.
   */
  editingProfile = signal<ProfileDto | null>(null);

  /** Tracks whether a save request is in flight; used to disable the submit button. */
  loading = signal(false);

  /** Tracks whether a logo upload/delete request is in flight. */
  logoLoading = signal(false);

  /** Holds a sanitized blob URL for the currently editing profile's logo preview. */
  logoPreviewUrl = signal<SafeUrl | null>(null);

  /** Holds a logo file selected during create mode, to be uploaded after the profile is saved. */
  pendingLogo = signal<File | null>(null);

  /**
   * Shared reactive form used for both creating and editing profiles.
   *
   * All optional fields are pre-initialised to empty strings rather than `null`
   * to avoid Angular's reactive forms treating them as unset, which can produce
   * unexpected dirty/pristine states. `country` defaults to `'Deutschland'` as
   * the primary target market.
   */
  form = this.fb.group({
    profileLabel: ['', Validators.required],
    isDefault: [false],
    type: ['INDIVIDUAL' as 'INDIVIDUAL' | 'ORGANIZATION', Validators.required],
    salutation: [''],
    title: [''],
    firstName: [''],
    lastName: [''],
    companyName: [''],
    department: [''],
    street: [''],
    streetNumber: [''],
    postalCode: [''],
    city: [''],
    country: ['Deutschland'],
    vatId: [''],
    taxNumber: [''],
    managingDirector: [''],
    registerCourt: [''],
    registerNumber: [''],
    iban: [''],
    bic: [''],
    bankName: [''],
    website: [''],
    phone: [''],
    fax: [''],
    email: [''],
    contactPerson: ['']
  });

  /**
   * Derived boolean reflecting whether the form is currently configured for an
   * organisation profile. Used in the template to show/hide organisation-only fields.
   */
  get isOrganization(): boolean {
    return this.form.get('type')?.value === 'ORGANIZATION';
  }

  /**
   * Programmatically sets the profile type control, enabling template buttons to
   * switch type without directly manipulating the form model from the template.
   *
   * @param type - The profile type to apply to the `type` control.
   */
  setType(type: 'INDIVIDUAL' | 'ORGANIZATION'): void {
    this.form.get('type')?.setValue(type);
  }

  /**
   * Sets the page title and fetches the current user's profiles on route activation.
   */
  ngOnInit(): void {
    this.title.setTitle('Profiles — Brief-Fix');
    this.profileService.loadProfiles().subscribe();
  }

  /**
   * Opens the side panel in create mode by clearing any previous editing state
   * and resetting the form to its default values.
   *
   * The `country` default is re-applied on reset because `FormGroup.reset` without
   * explicit defaults would set all controls to `null`.
   */
  openCreate(): void {
    this.editingProfile.set(null);
    this.pendingLogo.set(null);
    this.logoPreviewUrl.set(null);
    this.form.reset({ type: 'INDIVIDUAL', isDefault: false, country: 'Deutschland' });
    this.panelOpen.set(true);
  }

  /**
   * Opens the side panel in edit mode, populating the form with data from the
   * selected profile. Null-coalescences ensure that optional fields render as
   * empty strings rather than the literal text "null".
   *
   * @param profile - The `ProfileDto` to load into the form for editing.
   */
  openEdit(profile: ProfileDto): void {
    this.logoPreviewUrl.set(null);
    this.editingProfile.set(profile);
    if (profile.hasLogo) {
      this.profileService.getLogo(profile.id).subscribe(blob => {
        const url = URL.createObjectURL(blob);
        this.logoPreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(url));
      });
    }
    this.form.patchValue({
      profileLabel: profile.profileLabel,
      isDefault: profile.isDefault,
      type: profile.type,
      salutation: profile.salutation ?? '',
      title: profile.title ?? '',
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      companyName: profile.companyName ?? '',
      department: profile.department ?? '',
      street: profile.street ?? '',
      streetNumber: profile.streetNumber ?? '',
      postalCode: profile.postalCode ?? '',
      city: profile.city ?? '',
      country: profile.country ?? 'Deutschland',
      vatId: profile.vatId ?? '',
      taxNumber: profile.taxNumber ?? '',
      managingDirector: profile.managingDirector ?? '',
      registerCourt: profile.registerCourt ?? '',
      registerNumber: profile.registerNumber ?? '',
      iban: profile.iban ?? '',
      bic: profile.bic ?? '',
      bankName: profile.bankName ?? '',
      website: profile.website ?? '',
      phone: profile.phone ?? '',
      fax: profile.fax ?? '',
      email: profile.email ?? '',
      contactPerson: profile.contactPerson ?? ''
    });
    this.panelOpen.set(true);
  }

  /**
   * Closes the side panel and resets all form state and editing context.
   * Called both on explicit cancel and after a successful save.
   */
  closePanel(): void {
    this.panelOpen.set(false);
    this.editingProfile.set(null);
    this.pendingLogo.set(null);
    this.logoPreviewUrl.set(null);
    this.form.reset({ type: 'INDIVIDUAL', isDefault: false, country: 'Deutschland' });
  }

  /**
   * Handles form submission for both create and edit operations.
   *
   * The observable is selected at runtime based on `editingProfile`: a non-null
   * value routes to `ProfileService.update`; a null value routes to
   * `ProfileService.create`. This avoids duplicating the subscribe/error logic
   * for two separate submission paths.
   *
   * The `as any` cast on the form value is intentional: `FormGroup.value` returns
   * a partial type that does not exactly match the request interfaces, but the form
   * structure is intentionally aligned with `CreateProfileRequest`/`UpdateProfileRequest`.
   */
  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value as any;
    const editing = this.editingProfile();

    // Select the appropriate service method based on whether we are editing or creating.
    const obs = editing
      ? this.profileService.update(editing.id, val)
      : this.profileService.create(val);

    obs.subscribe({
      next: (saved) => {
        const pending = this.pendingLogo();
        if (!editing && pending) {
          // Upload the logo selected during create mode, then close.
          this.profileService.uploadLogo(saved.id, pending).subscribe({
            next: () => { this.loading.set(false); this.closePanel(); },
            error: () => { this.loading.set(false); this.closePanel(); }
          });
        } else {
          this.loading.set(false);
          this.closePanel();
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  /**
   * Deletes a profile by ID. The `ProfileService` signal is updated reactively
   * on success, so no explicit list refresh is needed.
   *
   * @param id - UUID of the profile to delete.
   */
  deleteProfile(id: string): void {
    this.profileService.delete(id).subscribe();
  }

  /**
   * Handles file input change for logo upload.
   * Uploads the selected file and refreshes the preview on success.
   *
   * @param event - The DOM change event from the file input.
   */
  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const id = this.editingProfile()?.id;
    if (id) {
      // Edit mode: upload immediately.
      this.logoLoading.set(true);
      this.profileService.uploadLogo(id, file).subscribe({
        next: () => {
          this.logoLoading.set(false);
          const url = URL.createObjectURL(file);
          this.logoPreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(url));
        },
        error: () => this.logoLoading.set(false)
      });
    } else {
      // Create mode: store for upload after the profile is saved.
      this.pendingLogo.set(file);
      const url = URL.createObjectURL(file);
      this.logoPreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(url));
    }
  }

  /**
   * Deletes the logo of the currently edited profile, or clears the pending logo
   * if the profile has not yet been saved.
   */
  onDeleteLogo(): void {
    const id = this.editingProfile()?.id;
    if (!id) {
      // Create mode: just clear the pending selection.
      this.pendingLogo.set(null);
      this.logoPreviewUrl.set(null);
      return;
    }
    this.logoLoading.set(true);
    this.profileService.deleteLogo(id).subscribe({
      next: () => {
        this.logoLoading.set(false);
        this.logoPreviewUrl.set(null);
      },
      error: () => this.logoLoading.set(false)
    });
  }

  /**
   * Formats the postal address components of a profile into a compact summary
   * string suitable for display in list items.
   *
   * Filters out falsy values before joining so that missing components do not
   * produce leading/trailing commas or double spaces.
   *
   * @param p - The `ProfileDto` whose address fields should be formatted.
   * @returns A comma-separated address summary string, e.g. `"10115, Berlin, Deutschland"`.
   */
  formatAddress(p: ProfileDto): string {
    return [p.postalCode, p.city, p.country].filter(v => !!v).join(', ');
  }
}

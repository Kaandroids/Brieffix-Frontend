/**
 * @file letters.ts
 * @description Standalone component for letter composition, preview, and management.
 *
 * This is the most feature-rich page component in the application. It orchestrates:
 * - Displaying the user's letter history.
 * - A multi-step composition form supporting both contact-based and manual recipient entry.
 * - Live PDF preview generation via `LetterService.preview`, displayed in an embedded iframe.
 * - Letter persistence via `LetterService.create`.
 * - PDF download for saved letters via `LetterService.getPdf`.
 * - Letter deletion.
 *
 * Template selection is plan-gated: premium templates are only selectable by users
 * with a `PREMIUM` subscription, as derived from the `UserService.me` signal.
 *
 * The form uses a single `FormGroup` whose recipient fields are conditionally
 * populated based on the selected `recipientType` (`contact` vs. `manual`) and
 * `recipientEntityType` (`INDIVIDUAL` vs. `ORGANIZATION`). The `buildRequest`
 * method translates the flat form value into the structured `GenerateLetterRequest`
 * shape expected by the API.
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { LetterService, LetterDto, LetterTemplate } from '../../services/letter';
import { ProfileService, ProfileDto } from '../../services/profile';
import { ContactService } from '../../services/contact';
import { UserService } from '../../services/user';

/**
 * Standalone page component that provides the full letter lifecycle UI:
 * composition, preview, save, download, and deletion.
 *
 * Service signals (`letters`, `profiles`, `contacts`, `me`) are referenced
 * directly so the template stays reactive to changes made elsewhere in the session
 * (e.g. a profile created on the Profiles page is immediately available here).
 */
@Component({
  selector: 'app-letters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './letters.html',
  styleUrl: './letters.scss'
})
export class Letters implements OnInit {
  private letterService = inject(LetterService);
  private profileService = inject(ProfileService);
  private contactService = inject(ContactService);
  private userService = inject(UserService);
  private sanitizer = inject(DomSanitizer);
  private fb = inject(FormBuilder);
  private title = inject(Title);

  /** Live reference to the letter history signal maintained by `LetterService`. */
  letters = this.letterService.letters;

  /** Live reference to the sender profiles signal maintained by `ProfileService`. */
  profiles = this.profileService.profiles;

  /** Live reference to the contacts signal maintained by `ContactService`. */
  contacts = this.contactService.contacts;

  /** Live reference to the current user signal maintained by `UserService`. */
  me = this.userService.me;

  /**
   * Computed boolean indicating whether the current user holds a Premium subscription.
   * Controls access to plan-gated letter templates in the form and template selector UI.
   */
  isPremium = computed(() => this.me()?.plan === 'PREMIUM');

  /**
   * Computed boolean indicating whether the user has at least one sender profile configured.
   * Can be used in the template to gate the compose button or display an onboarding prompt.
   */
  hasProfiles = computed(() => this.profiles().length > 0);

  /** Controls the visibility of the letter composition form panel. */
  formOpen = signal(false);

  /** Tracks whether a letter save request is currently in flight; prevents re-submission. */
  loading = signal(false);

  /**
   * Holds the sanitized `SafeResourceUrl` of the current PDF preview blob, or `null`
   * when no preview has been generated. The URL is created from an object URL and must
   * be cleared (and the object URL revoked) when no longer needed to avoid memory leaks.
   */
  previewUrl = signal<SafeResourceUrl | null>(null);

  /** Tracks whether a preview generation request is in flight. */
  previewLoading = signal(false);

  /** True when the viewport is phone-sized; iframes are unreliable on mobile browsers. */
  readonly isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  /**
   * Static list of available letter templates with plan-gate metadata.
   *
   * The `premium` flag is used to disable template selection in the UI for users
   * on the Standard plan. `setTemplate` enforces this gate programmatically to
   * prevent circumvention via direct form manipulation.
   */
  readonly templates: { id: LetterTemplate; label: string; premium: boolean }[] = [
    { id: 'CLASSIC',      label: 'Classic',      premium: false },
    { id: 'PROFESSIONAL', label: 'Professional', premium: true  },
  ];

  /**
   * Reactive letter composition form.
   *
   * Fields are split into three logical groups:
   * 1. **Sender** — `profileId` references the selected sender profile.
   * 2. **Recipient** — `recipientType` switches between contact-based and manual entry;
   *    `recipientEntityType` switches between individual and organisation address fields.
   * 3. **Content** — `title`, `body`, `letterDate`, and `template`.
   *
   * All recipient address fields are optional at the form level; validation of required
   * address data is delegated to the API.
   */
  form = this.fb.group({
    profileId:              ['', Validators.required],
    recipientType:          ['contact' as 'contact' | 'manual'],
    recipientEntityType:    ['INDIVIDUAL' as 'INDIVIDUAL' | 'ORGANIZATION'],
    contactId:              [''],
    recipientSalutation:    [''],
    recipientFirstName:     [''],
    recipientLastName:      [''],
    recipientCompany:       [''],
    recipientContactPerson: [''],
    recipientStreet:        [''],
    recipientStreetNumber:  [''],
    recipientPostalCode:    [''],
    recipientCity:          [''],
    recipientCountry:       [''],
    recipientEmail:         [''],
    recipientPhone:         [''],
    title:                  ['', Validators.required],
    body:                   ['', Validators.required],
    letterDate:             [new Date().toISOString().slice(0, 10)],
    template:               ['CLASSIC' as LetterTemplate, Validators.required],
  });

  /**
   * Whether the form is currently in manual recipient entry mode.
   * When `false`, the user selects from stored contacts via `contactId`.
   */
  get isManual(): boolean { return this.form.get('recipientType')?.value === 'manual'; }

  /**
   * Whether the manual recipient is being entered as an organisation.
   * Controls conditional display of company name vs. personal name fields.
   */
  get isOrganization(): boolean { return this.form.get('recipientEntityType')?.value === 'ORGANIZATION'; }

  /** The currently selected `LetterTemplate` identifier, read from the form control. */
  get selectedTemplate(): LetterTemplate { return this.form.get('template')?.value as LetterTemplate; }

  /**
   * The `ProfileDto` corresponding to the currently selected `profileId` form value.
   * Returns `undefined` if no matching profile is found (e.g. before profiles are loaded).
   */
  get selectedProfile(): ProfileDto | undefined {
    const id = this.form.get('profileId')?.value;
    return this.profiles().find(p => p.id === id);
  }

  /**
   * Sets the page title, triggers parallel data fetches, and registers a
   * `recipientEntityType` value-change subscription.
   *
   * The value-change subscription clears mutually exclusive fields when the user
   * switches between `INDIVIDUAL` and `ORGANIZATION` entry modes, preventing
   * stale personal name data from being submitted alongside organisation fields
   * (and vice versa).
   */
  ngOnInit(): void {
    this.title.setTitle('Letters — Brief-Fix');
    this.letterService.loadLetters().subscribe();
    this.profileService.loadProfiles().subscribe();
    this.contactService.loadContacts().subscribe();
    this.userService.loadMe().subscribe();

    // When the recipient entity type changes, clear fields that belong to the
    // previous type to prevent cross-type data contamination in the API request.
    this.form.get('recipientEntityType')!.valueChanges.subscribe(type => {
      if (type === 'ORGANIZATION') {
        this.form.patchValue({ recipientFirstName: '', recipientLastName: '' });
      } else {
        this.form.patchValue({ recipientCompany: '', recipientContactPerson: '' });
      }
    });
  }

  /**
   * Opens the composition form panel, pre-selecting the user's default profile (if any)
   * and resetting all other fields to their initial defaults.
   */
  openCreate(): void {
    const defaultProfile = this.profiles().find(p => p.isDefault);
    this.form.reset({
      profileId: defaultProfile?.id ?? '',
      recipientType: 'contact',
      recipientEntityType: 'INDIVIDUAL',
      letterDate: new Date().toISOString().slice(0, 10),
      template: 'CLASSIC',
    });
    this.clearPreview();
    this.formOpen.set(true);
  }

  /**
   * Closes the composition form panel and discards the current preview.
   */
  closeForm(): void {
    this.formOpen.set(false);
    this.clearPreview();
  }

  /**
   * Sets the active letter template, enforcing the plan-gate for premium templates.
   *
   * If the selected template is marked premium and the current user is not on the
   * Premium plan, the call is silently ignored. Clearing the preview on a valid
   * template change ensures the displayed preview always matches the selected template.
   *
   * @param t - The `LetterTemplate` identifier to apply.
   */
  setTemplate(t: LetterTemplate): void {
    const tpl = this.templates.find(x => x.id === t);
    // Silently reject premium template selection for non-premium users.
    if (tpl?.premium && !this.isPremium()) return;
    this.form.get('template')?.setValue(t);
    this.clearPreview();
  }

  /**
   * Requests a PDF preview from the API using the current form state and displays
   * it in the embedded preview panel via a sanitized object URL.
   *
   * `DomSanitizer.bypassSecurityTrustResourceUrl` is required because Angular's
   * default security policy blocks `blob:` scheme URLs in `<iframe src>` bindings.
   * The object URL is created from the API-returned `Blob` and is valid only for
   * the lifetime of the current document; `clearPreview` must be called before a
   * new URL is set to avoid orphaned blob references.
   */
  onPreview(): void {
    if (this.form.invalid) return;
    this.clearPreview();
    this.previewLoading.set(true);
    this.letterService.preview(this.buildRequest()).subscribe({
      next: blob => {
        // Convert the binary PDF blob to a temporary browser-local URL for iframe display.
        const url = URL.createObjectURL(blob);
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.previewLoading.set(false);
      },
      error: () => this.previewLoading.set(false)
    });
  }

  closePreview(): void {
    this.clearPreview();
  }

  /**
   * Mobile alternative to `onPreview`: generates the PDF and immediately triggers
   * a file download instead of showing it in an iframe (which is blocked on iOS/Android).
   */
  onPreviewDownload(): void {
    if (this.form.invalid) return;
    this.previewLoading.set(true);
    this.letterService.preview(this.buildRequest()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.form.get('title')?.value || 'brief'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.previewLoading.set(false);
      },
      error: () => this.previewLoading.set(false)
    });
  }

  /**
   * Persists the current letter to the API and closes the form on success.
   *
   * `LetterService.create` prepends the new letter to the `letters` signal,
   * so the history list updates immediately without a re-fetch.
   */
  onSave(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.letterService.create(this.buildRequest()).subscribe({
      next: () => { this.loading.set(false); this.closeForm(); },
      error: () => this.loading.set(false)
    });
  }

  /**
   * Downloads the PDF for a saved letter by triggering a programmatic anchor click.
   *
   * A temporary `<a>` element is created, populated with a blob object URL and the
   * letter's title as the download filename, clicked, and then immediately destroyed.
   * `URL.revokeObjectURL` is called afterwards to release the blob from browser memory.
   *
   * @param letter - The `LetterDto` whose PDF should be downloaded.
   */
  downloadPdf(letter: LetterDto): void {
    this.letterService.getPdf(letter.id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${letter.title}.pdf`;
      a.click();
      // Revoke immediately after click to free the blob URL from memory.
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Deletes a letter by ID. The `LetterService` signal is updated reactively on
   * success, so no explicit list refresh is required.
   *
   * @param id - UUID of the letter to delete.
   */
  deleteLetter(id: string): void {
    this.letterService.delete(id).subscribe();
  }

  /**
   * Resolves a display-friendly name for a letter's sender from its snapshot.
   *
   * For organisation senders, returns the company name with a fallback chain to
   * the profile label then an em-dash. For individual senders, joins first and
   * last name, falling back to the profile label or em-dash.
   *
   * @param letter - The `LetterDto` whose sender snapshot should be resolved.
   * @returns A human-readable sender name string.
   */
  senderName(letter: LetterDto): string {
    const s = letter.senderSnapshot;
    if (s.type === 'ORGANIZATION') return s.companyName ?? s.profileLabel ?? '—';
    return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.profileLabel || '—';
  }

  /**
   * Resolves a display-friendly name for a letter's recipient from its snapshot.
   *
   * Prefers company name for organisation recipients; otherwise joins salutation,
   * first name, and last name, falling back to an em-dash if no data is available.
   *
   * @param letter - The `LetterDto` whose recipient snapshot should be resolved.
   * @returns A human-readable recipient name string.
   */
  recipientName(letter: LetterDto): string {
    const r = letter.recipientSnapshot;
    if (r.companyName) return r.companyName;
    return [r.salutation, r.firstName, r.lastName].filter(Boolean).join(' ') || '—';
  }

  /**
   * Formats an ISO 8601 date string into the German locale date format (DD.MM.YYYY).
   *
   * @param dateStr - An ISO 8601 date or datetime string.
   * @returns A locale-formatted date string suitable for display in the German market.
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('de-DE',
      { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Resolves a display-friendly name for a contact in the recipient selection dropdown.
   *
   * Typed as `any` because the dropdown iterates over the raw `contacts` signal array
   * whose items match `ContactDto` at runtime, but the template binding context does
   * not carry the full generic type information.
   *
   * @param c - The contact object from the dropdown iteration.
   * @returns A human-readable contact name string.
   */
  contactDisplayName(c: any): string {
    if (c.type === 'ORGANIZATION') return c.companyName ?? '—';
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
  }

  /**
   * Translates the flat form value into the `GenerateLetterRequest` shape expected
   * by `LetterService.preview` and `LetterService.create`.
   *
   * Key transformation logic:
   * - When `recipientType` is `'contact'`, `contactId` is passed and all manual
   *   recipient fields are set to `undefined` so the API resolves the recipient
   *   from the stored contact record.
   * - When `recipientType` is `'manual'`, `contactId` is omitted and the explicit
   *   recipient fields are forwarded, with empty strings normalised to `undefined`
   *   to avoid sending blank strings to the API.
   *
   * @returns A fully-formed `GenerateLetterRequest` object ready for API submission.
   */
  private buildRequest() {
    const v = this.form.value as any;
    const isContact = v.recipientType === 'contact';
    return {
      profileId: v.profileId,
      // Pass contactId only when using contact-based recipient mode and a contact is selected.
      contactId: isContact && v.contactId ? v.contactId : undefined,
      // Manual recipient fields: only included when not using a stored contact.
      // Empty strings are coerced to undefined to prevent the API from receiving blank values.
      recipientSalutation:    !isContact ? v.recipientSalutation    || undefined : undefined,
      recipientFirstName:     !isContact ? v.recipientFirstName     || undefined : undefined,
      recipientLastName:      !isContact ? v.recipientLastName      || undefined : undefined,
      recipientCompany:       !isContact ? v.recipientCompany       || undefined : undefined,
      recipientContactPerson: !isContact ? v.recipientContactPerson || undefined : undefined,
      recipientStreet:        !isContact ? v.recipientStreet        || undefined : undefined,
      recipientStreetNumber:  !isContact ? v.recipientStreetNumber  || undefined : undefined,
      recipientPostalCode:    !isContact ? v.recipientPostalCode    || undefined : undefined,
      recipientCity:          !isContact ? v.recipientCity          || undefined : undefined,
      recipientCountry:       !isContact ? v.recipientCountry       || undefined : undefined,
      recipientEmail:         !isContact ? v.recipientEmail         || undefined : undefined,
      recipientPhone:         !isContact ? v.recipientPhone         || undefined : undefined,
      title: v.title,
      body:  v.body,
      letterDate: v.letterDate || undefined,
      template: v.template,
    };
  }

  /**
   * Nulls out the current preview URL signal, effectively hiding the preview iframe.
   *
   * Note: this does not call `URL.revokeObjectURL` on the previous blob URL because
   * the raw `string` URL is not retained — only the `SafeResourceUrl` wrapper is
   * stored. Blob cleanup relies on the browser releasing the object URL when the
   * document is unloaded or when the blob is no longer referenced.
   */
  private clearPreview(): void {
    this.previewUrl.set(null);
  }
}

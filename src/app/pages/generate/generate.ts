/**
 * @file generate.ts
 * @description Standalone component for the public unauthenticated letter builder.
 *
 * Accessible at `/erstellen` without a user account. Allows prospective users to
 * experience the core letter-generation feature — entering sender and recipient
 * details, composing letter content, previewing the rendered PDF in-browser, and
 * downloading the final document — before committing to registration.
 *
 * All API calls are routed through `PublicLetterService`, which targets the
 * rate-limited `/api/v1/public/letter-preview` endpoint. The component handles
 * the HTTP 429 (rate-limit exceeded) response distinctly from generic errors to
 * display a contextually appropriate message to the user.
 *
 * Sender and recipient type selection (`INDIVIDUAL` / `ORGANIZATION`) is managed
 * via dedicated signals (`senderType`, `recipientType`) rather than form controls,
 * with type switching clearing mutually exclusive fields to prevent ghost data from
 * reaching the PDF renderer.
 */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PublicLetterService } from '../../services/public-letter';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

/**
 * Standalone public letter builder page component.
 *
 * Composed with the shared `Navbar` and `Footer` to maintain visual consistency
 * with other public pages. No authentication guard is applied to this route.
 */
@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Navbar, Footer],
  templateUrl: './generate.html',
  styleUrl: './generate.scss'
})
export class Generate {
  private fb = inject(FormBuilder);
  private publicLetterService = inject(PublicLetterService);
  private sanitizer = inject(DomSanitizer);

  /** Tracks whether the final PDF download request is in flight. */
  loading        = signal(false);

  /** Tracks whether the preview generation request is in flight. */
  previewLoading = signal(false);

  /**
   * Holds the sanitized `SafeResourceUrl` of the current PDF preview blob, or
   * `null` when no preview is active. Displayed in an `<iframe>` in the preview modal.
   * `DomSanitizer.bypassSecurityTrustResourceUrl` is required because Angular blocks
   * `blob:` scheme URLs by default.
   */
  previewUrl     = signal<SafeResourceUrl | null>(null);

  /** Holds a generic error message when the API returns an unexpected failure. */
  error          = signal('');

  /**
   * Set to `true` when the API responds with HTTP 429 (Too Many Requests).
   * Displayed as a distinct user-facing message separate from generic errors.
   */
  rateLimited    = signal(false);

  /** Set to `true` after a successful PDF download to show a confirmation message. */
  success        = signal(false);

  /**
   * Reactive signal tracking the currently selected sender type.
   * Controls which sender fields are rendered in the template and which fields
   * are cleared when the type is switched.
   */
  senderType    = signal<'INDIVIDUAL' | 'ORGANIZATION'>('INDIVIDUAL');

  /**
   * Reactive signal tracking the currently selected recipient type.
   * Controls which recipient fields are rendered in the template and which fields
   * are cleared when the type is switched.
   */
  recipientType = signal<'INDIVIDUAL' | 'ORGANIZATION'>('INDIVIDUAL');

  /**
   * Reactive letter composition form for the public builder.
   *
   * Fields are split into three groups:
   * 1. **Sender** — individual and organisation fields; type-exclusive fields
   *    are cleared on type switch via `setSenderType`.
   * 2. **Recipient** — individual and organisation fields; cleared on type switch
   *    via `setRecipientType`.
   * 3. **Content** — `title`, `body`, and `letterDate`.
   *
   * Only `senderPostalCode`, `senderCity`, `title`, and `body` are marked as
   * required; all address fields are optional to reduce friction for anonymous users.
   */
  form = this.fb.group({
    // Sender — individual
    senderSalutation:   [''],
    senderTitle:        [''],
    senderFirstName:    [''],
    senderLastName:     [''],
    // Sender — organization
    senderCompanyName:  [''],
    senderDepartment:   [''],
    senderContactPerson:[''],
    // Sender — shared
    senderStreet:       [''],
    senderStreetNumber: [''],
    senderPostalCode:   ['', Validators.required],
    senderCity:         ['', Validators.required],
    senderCountry:      ['Deutschland'],
    senderEmail:        [''],
    senderPhone:        [''],
    // Recipient — individual
    recipientSalutation:   [''],
    recipientFirstName:    [''],
    recipientLastName:     [''],
    // Recipient — organization
    recipientCompany:                [''],
    recipientDepartment:             [''],
    recipientContactPersonSalutation:[''],
    recipientContactPerson:          [''],
    // Recipient — shared
    recipientStreet:       [''],
    recipientStreetNumber: [''],
    recipientPostalCode:   [''],
    recipientCity:         [''],
    recipientCountry:      ['Deutschland'],
    // Letter content
    title:      ['', Validators.required],
    body:       ['', Validators.required],
    letterDate: [new Date().toISOString().split('T')[0]],
  });

  /**
   * Switches the sender type and clears the fields that belong exclusively to
   * the previous type, preventing cross-type data contamination in the PDF output.
   *
   * @param type - The sender type to activate (`'INDIVIDUAL'` or `'ORGANIZATION'`).
   */
  setSenderType(type: 'INDIVIDUAL' | 'ORGANIZATION') {
    this.senderType.set(type);
    if (type === 'INDIVIDUAL') {
      this.form.patchValue({ senderCompanyName: '', senderDepartment: '', senderContactPerson: '' });
    } else {
      this.form.patchValue({ senderTitle: '', senderFirstName: '', senderLastName: '' });
    }
  }

  /**
   * Switches the recipient type and clears the fields that belong exclusively to
   * the previous type, preventing cross-type data contamination in the PDF output.
   *
   * @param type - The recipient type to activate (`'INDIVIDUAL'` or `'ORGANIZATION'`).
   */
  setRecipientType(type: 'INDIVIDUAL' | 'ORGANIZATION') {
    this.recipientType.set(type);
    if (type === 'INDIVIDUAL') {
      this.form.patchValue({ recipientCompany: '', recipientDepartment: '', recipientContactPerson: '', recipientContactPersonSalutation: '' });
    } else {
      this.form.patchValue({ recipientSalutation: '', recipientFirstName: '', recipientLastName: '' });
    }
  }

  /**
   * Validates the form and requests a PDF preview from the public endpoint.
   *
   * The preview blob is converted to a `blob:` object URL and stored as a
   * sanitized `SafeResourceUrl` for iframe display. If the form is invalid,
   * all controls are touched to surface validation messages simultaneously.
   */
  openPreviewModal() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.previewUrl.set(null);
    this.previewLoading.set(true);
    this.error.set('');
    this.rateLimited.set(false);

    this.publicLetterService.preview(this.buildRequest()).subscribe({
      next: (blob) => {
        // Convert the PDF blob to a temporary browser-local URL for iframe display.
        const url = URL.createObjectURL(blob);
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.previewLoading.set(false);
      },
      error: (err) => {
        this.previewLoading.set(false);
        this.handleError(err);
      }
    });
  }

  /** Dismisses the PDF preview modal by clearing the preview URL signal. */
  closePreview() {
    this.previewUrl.set(null);
  }

  /**
   * Validates the form, requests the PDF from the public endpoint, and triggers
   * a browser file download on success.
   *
   * Uses a 5-second timeout before revoking the object URL to ensure the download
   * has initiated before the blob reference is released, accommodating slower devices.
   * On rate-limit or generic error, delegates to `handleError`.
   */
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.success.set(false);
    this.rateLimited.set(false);

    this.publicLetterService.preview(this.buildRequest()).subscribe({
      next: (blob) => {
        this.loading.set(false);
        this.success.set(true);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (this.form.value.title || 'brief') + '.pdf';
        a.click();
        // Delay revocation to ensure the download has begun before the blob is released.
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleError(err);
      }
    });
  }

  /**
   * Translates the flat form value and type signals into the `PublicLetterPreviewRequest`
   * shape expected by `PublicLetterService.preview`.
   *
   * Empty string values are normalised to `undefined` so that the API does not
   * receive blank fields, which could affect PDF address block rendering.
   * `senderPostalCode` and `senderCity` are passed with the non-null assertion
   * operator (`!`) because they are enforced as required by the form validators.
   *
   * @returns A fully-formed `PublicLetterPreviewRequest` object ready for API submission.
   */
  private buildRequest() {
    const v = this.form.value;
    return {
      senderType:        this.senderType(),
      senderSalutation:  v.senderSalutation  || undefined,
      senderTitle:       v.senderTitle       || undefined,
      senderFirstName:   v.senderFirstName   || undefined,
      senderLastName:    v.senderLastName    || undefined,
      senderCompanyName:  v.senderCompanyName  || undefined,
      senderDepartment:   v.senderDepartment   || undefined,
      senderContactPerson:v.senderContactPerson|| undefined,
      senderStreet:       v.senderStreet       || undefined,
      senderStreetNumber: v.senderStreetNumber || undefined,
      senderPostalCode:   v.senderPostalCode!,
      senderCity:         v.senderCity!,
      senderCountry:      v.senderCountry      || 'Deutschland',
      senderEmail:        v.senderEmail        || undefined,
      senderPhone:        v.senderPhone        || undefined,
      recipientType:               this.recipientType(),
      recipientSalutation:         v.recipientSalutation         || undefined,
      recipientFirstName:          v.recipientFirstName          || undefined,
      recipientLastName:           v.recipientLastName           || undefined,
      recipientCompany:            v.recipientCompany            || undefined,
      recipientDepartment:         v.recipientDepartment         || undefined,
      recipientContactPerson:      v.recipientContactPerson      || undefined,
      recipientContactPersonSalutation: v.recipientContactPersonSalutation || undefined,
      recipientStreet:       v.recipientStreet       || undefined,
      recipientStreetNumber: v.recipientStreetNumber || undefined,
      recipientPostalCode:   v.recipientPostalCode   || undefined,
      recipientCity:         v.recipientCity         || undefined,
      recipientCountry:      v.recipientCountry      || 'Deutschland',
      title:      v.title!,
      body:       v.body!,
      letterDate: v.letterDate || undefined,
    };
  }

  /**
   * Classifies an API error response and updates the appropriate error signal.
   *
   * HTTP 429 (Too Many Requests) is surfaced as a rate-limit message to inform
   * the user they must wait before generating another letter. All other errors
   * are treated as generic failures.
   *
   * @param err - The `HttpErrorResponse` from the failed API call.
   */
  private handleError(err: any) {
    if (err.status === 429) {
      this.rateLimited.set(true);
    } else {
      this.error.set('Fehler beim Erstellen des Briefes. Bitte versuchen Sie es erneut.');
    }
  }

  /** Convenience accessor for form controls, used in template validation bindings. */
  get f() { return this.form.controls; }
}

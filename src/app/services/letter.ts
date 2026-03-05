/**
 * @file letter.ts
 * @description Service and associated types for letter generation, retrieval,
 * and management in the Briefix application.
 *
 * Letters are the core output artifact of Briefix. Each letter is composed from
 * a sender profile and a recipient (either a stored contact or ad-hoc address
 * fields), a template that controls visual rendering, and freeform content.
 *
 * A key design consideration is that both sender and recipient data are captured
 * as immutable snapshots at generation time (`SenderSnapshot`, `RecipientSnapshot`).
 * This ensures that a letter's rendered output remains stable even if the
 * underlying profile or contact record is later modified or deleted.
 *
 * The service maintains a reactive `letters` signal updated after each mutation.
 */

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/**
 * Identifies the visual template applied when rendering a letter to PDF.
 *
 * - `CLASSIC`      — Standard DIN 5008 style; available to all users.
 * - `MODERN`       — Contemporary layout; availability may be plan-gated.
 * - `PROFESSIONAL` — Formal corporate layout; restricted to Premium users.
 * - `ELEGANT`      — Refined typographic style; availability may be plan-gated.
 */
export type LetterTemplate = 'CLASSIC' | 'MODERN' | 'PROFESSIONAL' | 'ELEGANT';

/**
 * Immutable snapshot of the sender profile data captured at letter generation time.
 *
 * This snapshot is embedded in the persisted `LetterDto` so that the rendered
 * letter's sender details are unaffected by subsequent edits to the source profile.
 * Field semantics mirror those of `ProfileDto`.
 *
 * @property type              - Profile type discriminator (`INDIVIDUAL` or `ORGANIZATION`).
 * @property profileLabel      - Human-readable label of the source profile.
 * @property salutation        - Sender salutation prefix.
 * @property title             - Academic or professional title.
 * @property firstName         - Sender given name.
 * @property lastName          - Sender family name.
 * @property companyName       - Legal entity name for organisation senders.
 * @property department        - Department within the organisation.
 * @property street            - Street name.
 * @property streetNumber      - Building number.
 * @property postalCode        - Postal / ZIP code.
 * @property city              - City or locality.
 * @property country           - Country name.
 * @property phone             - Primary telephone number.
 * @property fax               - Facsimile number.
 * @property email             - Sender email address.
 * @property website           - Public website URL.
 * @property vatId             - VAT identification number.
 * @property taxNumber         - Tax authority registration number.
 * @property managingDirector  - Managing director name(s) for GmbH entities.
 * @property registerCourt     - Court of commercial registration.
 * @property registerNumber    - Commercial register entry number.
 * @property iban              - Bank account IBAN.
 * @property bic               - Bank Identifier Code.
 * @property bankName          - Name of the bank.
 * @property contactPerson     - Named contact representative.
 */
export interface SenderSnapshot {
  type: string;
  profileLabel?: string;
  salutation?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  department?: string;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  vatId?: string;
  taxNumber?: string;
  managingDirector?: string;
  registerCourt?: string;
  registerNumber?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  contactPerson?: string;
}

/**
 * Immutable snapshot of recipient address data captured at letter generation time.
 *
 * Like `SenderSnapshot`, this decouples the stored letter from the contact record
 * it was generated from, allowing contact details to change without invalidating
 * historical letters.
 *
 * @property type          - Recipient type discriminator (`INDIVIDUAL` or `ORGANIZATION`).
 * @property salutation    - Recipient greeting prefix.
 * @property firstName     - Recipient given name.
 * @property lastName      - Recipient family name.
 * @property companyName   - Organisation name for business recipients.
 * @property contactPerson - Named contact within the organisation.
 * @property street        - Street name.
 * @property streetNumber  - Building number.
 * @property postalCode    - Postal / ZIP code.
 * @property city          - City or locality.
 * @property country       - Country name.
 * @property email         - Recipient email address.
 * @property phone         - Recipient telephone number.
 */
export interface RecipientSnapshot {
  type?: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactPerson?: string;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
}

/**
 * Full representation of a persisted letter as returned by the API.
 *
 * @property id                - Server-assigned UUID.
 * @property userId            - UUID of the owning user account.
 * @property title             - Letter subject / title line.
 * @property body              - Main letter text (may contain basic formatting).
 * @property letterDate        - Date printed on the letter (ISO 8601 date string).
 * @property senderSnapshot    - Frozen copy of sender data at generation time.
 * @property recipientSnapshot - Frozen copy of recipient data at generation time.
 * @property template          - The visual template used to render this letter.
 * @property pdfUrl            - Optional pre-signed URL to the generated PDF artifact,
 *                               if the server has produced one asynchronously.
 * @property createdAt         - ISO 8601 timestamp of letter creation.
 */
export interface LetterDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  letterDate: string;
  senderSnapshot: SenderSnapshot;
  recipientSnapshot: RecipientSnapshot;
  template: LetterTemplate;
  pdfUrl?: string;
  createdAt: string;
}

/**
 * Request body for both previewing and creating a letter.
 *
 * The recipient can be specified either by referencing a stored contact via
 * `contactId` or by providing individual `recipient*` fields manually. When
 * `contactId` is supplied, the API resolves the contact server-side; when
 * absent, the explicit fields are used directly.
 *
 * @property profileId               - UUID of the sender profile to use.
 * @property contactId               - Optional UUID of a stored contact to use as
 *                                     the recipient; takes precedence over manual fields.
 * @property recipientSalutation     - Manual recipient salutation.
 * @property recipientFirstName      - Manual recipient given name.
 * @property recipientLastName       - Manual recipient family name.
 * @property recipientCompany        - Manual recipient company name.
 * @property recipientContactPerson  - Manual recipient contact person name.
 * @property recipientStreet         - Manual recipient street name.
 * @property recipientStreetNumber   - Manual recipient building number.
 * @property recipientPostalCode     - Manual recipient postal code.
 * @property recipientCity           - Manual recipient city.
 * @property recipientCountry        - Manual recipient country.
 * @property recipientEmail          - Manual recipient email address.
 * @property recipientPhone          - Manual recipient phone number.
 * @property title                   - Letter subject / title line.
 * @property body                    - Main letter text.
 * @property letterDate              - Date to print on the letter (ISO 8601 date string).
 * @property template                - Template identifier controlling PDF layout.
 */
export interface GenerateLetterRequest {
  profileId: string;
  contactId?: string;
  recipientSalutation?: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientCompany?: string;
  recipientContactPerson?: string;
  recipientStreet?: string;
  recipientStreetNumber?: string;
  recipientPostalCode?: string;
  recipientCity?: string;
  recipientCountry?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  body: string;
  letterDate?: string;
  template: LetterTemplate;
}

/**
 * Root-provided singleton service for letter generation, retrieval, PDF download,
 * and deletion.
 *
 * Maintains a reactive `letters` signal ordered with the most recently created
 * letter first. The `create` method prepends new entries to the signal to keep
 * this ordering consistent without requiring a re-sort after each insertion.
 */
@Injectable({ providedIn: 'root' })
export class LetterService {
  /** Base URL prefix for letter API endpoints. */
  private readonly base = '/api/v1/letters';
  private http = inject(HttpClient);

  /**
   * Reactive signal containing the current user's letter history.
   * Initialised as an empty array; populated by `loadLetters`.
   * The list is maintained in reverse-chronological insertion order.
   */
  letters = signal<LetterDto[]>([]);

  /**
   * Fetches all letters belonging to the authenticated user and replaces the
   * `letters` signal with the server-returned list.
   *
   * @returns Observable that emits the full `LetterDto[]` array on success.
   */
  loadLetters(): Observable<LetterDto[]> {
    return this.http.get<LetterDto[]>(this.base).pipe(
      tap(list => this.letters.set(list))
    );
  }

  /**
   * Requests a transient PDF preview of a letter without persisting it.
   *
   * The API returns a raw PDF binary; the `responseType: 'blob'` option instructs
   * `HttpClient` to return a `Blob` rather than attempting JSON parsing.
   * The caller is responsible for creating and revoking an object URL from the blob.
   *
   * @param req - Letter composition data identical to what would be used to create.
   * @returns Observable that emits a `Blob` containing the rendered PDF.
   */
  preview(req: GenerateLetterRequest): Observable<Blob> {
    return this.http.post(`${this.base}/preview`, req, { responseType: 'blob' });
  }

  /**
   * Persists a new letter and prepends it to the `letters` signal so that it
   * appears first in reverse-chronological listings without a re-fetch.
   *
   * @param req - Letter composition data to persist.
   * @returns Observable that emits the created `LetterDto` (with server-assigned id).
   */
  create(req: GenerateLetterRequest): Observable<LetterDto> {
    return this.http.post<LetterDto>(this.base, req).pipe(
      tap(l => this.letters.update(list => [l, ...list]))
    );
  }

  /**
   * Downloads the PDF for a persisted letter by its ID.
   *
   * Returns the raw binary as a `Blob`; callers should create a temporary object
   * URL and trigger a browser download, then revoke the URL to free memory.
   *
   * @param id - UUID of the letter whose PDF is requested.
   * @returns Observable that emits a `Blob` containing the letter PDF.
   */
  getPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }

  /**
   * Deletes a letter by ID and removes it from the `letters` signal.
   *
   * @param id - UUID of the letter to delete.
   * @returns Observable that completes without emitting a value on success.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => this.letters.update(list => list.filter(l => l.id !== id)))
    );
  }
}

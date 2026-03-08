/**
 * @file public-letter.ts
 * @description Service for unauthenticated public letter preview generation.
 *
 * Exposes the `/api/v1/public/letter-preview` endpoint, which renders a
 * DIN 5008-compliant PDF from the supplied sender and recipient data without
 * requiring a user account or JWT token. This endpoint is rate-limited server-side
 * (by IP) to prevent abuse.
 *
 * Used exclusively by the `Generate` page (`/erstellen`), which allows
 * prospective users to experience the letter generation feature before registering.
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Request body for the public letter preview endpoint.
 *
 * Sender postal code (`senderPostalCode`) and city (`senderCity`) are the only
 * required fields, as they are mandatory for a valid DIN 5008 address block.
 * All other fields are optional and control the richness of the generated PDF.
 *
 * Fields are grouped by concern: sender identity, sender address, recipient
 * identity, recipient address, and letter content.
 *
 * @property senderType                       - Discriminator: `'INDIVIDUAL'` or `'ORGANIZATION'`.
 * @property senderSalutation                 - Sender salutation (e.g. "Herr", "Frau").
 * @property senderTitle                      - Sender academic or professional title.
 * @property senderFirstName                  - Sender given name.
 * @property senderLastName                   - Sender family name.
 * @property senderCompanyName                - Legal entity name for organisation senders.
 * @property senderDepartment                 - Sender department within an organisation.
 * @property senderContactPerson              - Named contact representative for the sender.
 * @property senderStreet                     - Sender street name.
 * @property senderStreetNumber               - Sender building number.
 * @property senderPostalCode                 - Sender postal / ZIP code (required).
 * @property senderCity                       - Sender city (required).
 * @property senderCountry                    - Sender country name.
 * @property senderEmail                      - Sender email address.
 * @property senderPhone                      - Sender telephone number.
 * @property recipientType                    - Discriminator: `'INDIVIDUAL'` or `'ORGANIZATION'`.
 * @property recipientSalutation              - Recipient salutation.
 * @property recipientFirstName               - Recipient given name.
 * @property recipientLastName                - Recipient family name.
 * @property recipientCompany                 - Recipient company name.
 * @property recipientDepartment              - Recipient department.
 * @property recipientContactPerson           - Named contact within the recipient organisation.
 * @property recipientContactPersonSalutation - Salutation for the recipient contact person.
 * @property recipientStreet                  - Recipient street name.
 * @property recipientStreetNumber            - Recipient building number.
 * @property recipientPostalCode              - Recipient postal / ZIP code.
 * @property recipientCity                    - Recipient city.
 * @property recipientCountry                 - Recipient country.
 * @property title                            - Letter subject / title line (required).
 * @property body                             - Main letter text (required).
 * @property letterDate                       - Date printed on the letter (ISO 8601).
 */
export interface PublicLetterPreviewRequest {
  // ── Sender ────────────────────────────────────────────────────────────────
  senderType?: string;
  senderSalutation?: string;
  senderTitle?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderCompanyName?: string;
  senderDepartment?: string;
  senderContactPerson?: string;
  senderStreet?: string;
  senderStreetNumber?: string;
  senderPostalCode: string;
  senderCity: string;
  senderCountry?: string;
  senderEmail?: string;
  senderPhone?: string;
  // ── Recipient ─────────────────────────────────────────────────────────────
  recipientType?: string;
  recipientSalutation?: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientCompany?: string;
  recipientDepartment?: string;
  recipientContactPerson?: string;
  recipientContactPersonSalutation?: string;
  recipientStreet?: string;
  recipientStreetNumber?: string;
  recipientPostalCode?: string;
  recipientCity?: string;
  recipientCountry?: string;
  // ── Content ───────────────────────────────────────────────────────────────
  title: string;
  body: string;
  letterDate?: string;
}

/**
 * Root-provided singleton service for the unauthenticated public letter preview.
 *
 * Stateless by design; each `preview` call produces an independent HTTP request.
 * The returned `Blob` is a raw PDF binary; callers are responsible for creating
 * a temporary object URL and triggering a browser download or iframe display,
 * then revoking the URL to release memory.
 */
@Injectable({ providedIn: 'root' })
export class PublicLetterService {
  private http = inject(HttpClient);

  /**
   * Requests a PDF rendering of the supplied letter data from the public endpoint.
   *
   * No authentication token is required; the `authInterceptor` will pass the
   * request through unmodified if no token is stored in `localStorage`.
   *
   * @param req - All sender, recipient, and content data for the letter.
   * @returns Observable that emits a `Blob` containing the rendered PDF on success.
   */
  preview(req: PublicLetterPreviewRequest): Observable<Blob> {
    return this.http.post('/api/v1/public/letter-preview', req, { responseType: 'blob' });
  }
}

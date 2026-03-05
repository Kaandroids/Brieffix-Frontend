/**
 * @file profile.ts
 * @description Service and associated types for managing sender profiles in Briefix.
 *
 * A "profile" represents the sender's identity as it appears on a generated letter —
 * analogous to a letterhead template. Profiles can represent either an individual
 * person or a legal organisation, and include all fields required for professional
 * correspondence: personal details, postal address, banking information, and
 * commercial register data.
 *
 * The service maintains a reactive `profiles` signal so that UI components
 * automatically reflect create/update/delete operations without re-fetching from
 * the API on every interaction.
 */

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/**
 * Full representation of a sender profile as returned by the API.
 *
 * Fields are intentionally nullable/optional to accommodate both individual
 * and organisation profile types — not all fields are relevant to both.
 *
 * @property id                - Server-assigned UUID.
 * @property userId            - UUID of the owning user account.
 * @property profileLabel      - Human-readable name used to identify this profile
 *                               in the UI (e.g. "Freelance", "GmbH").
 * @property isDefault         - When `true`, this profile is pre-selected in the
 *                               letter composition form.
 * @property type              - Discriminates between personal and business profiles,
 *                               controlling which fields are rendered and required.
 * @property salutation        - Greeting prefix (e.g. "Herr", "Frau").
 * @property title             - Academic or professional title (e.g. "Dr.", "Prof.").
 * @property firstName         - Given name; applicable to `INDIVIDUAL` profiles.
 * @property lastName          - Family name; applicable to `INDIVIDUAL` profiles.
 * @property companyName       - Legal entity name; applicable to `ORGANIZATION` profiles.
 * @property department        - Department or business unit within an organisation.
 * @property street            - Street name component of the postal address.
 * @property streetNumber      - Building number component of the postal address.
 * @property postalCode        - Postal / ZIP code.
 * @property city              - City or locality.
 * @property country           - Country name or code.
 * @property vatId             - Value-Added Tax identification number.
 * @property taxNumber         - Tax authority registration number (Steuernummer).
 * @property managingDirector  - Name(s) of the Geschäftsführer for GmbH entities.
 * @property registerCourt     - Court of registration (Registergericht).
 * @property registerNumber    - Commercial register entry number (Handelsregisternummer).
 * @property iban              - International Bank Account Number for payment details.
 * @property bic               - Bank Identifier Code associated with the IBAN.
 * @property bankName          - Name of the bank holding the account.
 * @property website           - Public website URL.
 * @property phone             - Primary telephone number.
 * @property fax               - Facsimile number.
 * @property email             - Contact email address for the profile.
 * @property contactPerson     - Named contact representative within an organisation.
 * @property createdAt         - ISO 8601 creation timestamp.
 */
export interface ProfileDto {
  id: string;
  userId: string;
  profileLabel: string;
  isDefault: boolean;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
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
  vatId?: string;
  taxNumber?: string;
  managingDirector?: string;
  registerCourt?: string;
  registerNumber?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  website?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactPerson?: string;
  createdAt?: string;
}

/**
 * Request body for creating a new sender profile.
 *
 * Mirrors `ProfileDto` minus the server-generated fields (`id`, `userId`,
 * `createdAt`). All optional fields follow the same semantics as `ProfileDto`.
 */
export interface CreateProfileRequest {
  profileLabel: string;
  isDefault: boolean;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
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
  vatId?: string;
  taxNumber?: string;
  managingDirector?: string;
  registerCourt?: string;
  registerNumber?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  website?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactPerson?: string;
}

/**
 * Request body for a full profile replacement (HTTP PUT).
 *
 * Structurally identical to `CreateProfileRequest`; typed as an alias to signal
 * intent at call sites and to allow independent evolution if the two shapes diverge.
 */
export type UpdateProfileRequest = CreateProfileRequest;

/**
 * Root-provided singleton service for CRUD operations on sender profiles.
 *
 * Maintains a reactive `profiles` signal that acts as a client-side cache.
 * Mutation methods (`create`, `update`, `delete`) update the signal optimistically
 * after a successful API response, avoiding a full re-fetch on every change.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  /** Base URL prefix for profile API endpoints. */
  private readonly base = '/api/v1/profiles';
  private http = inject(HttpClient);

  /**
   * Reactive signal containing the current user's list of sender profiles.
   * Initialised as an empty array; populated by `loadProfiles`.
   */
  profiles = signal<ProfileDto[]>([]);

  /**
   * Fetches all profiles belonging to the authenticated user and replaces
   * the entire `profiles` signal with the server-returned list.
   *
   * Intended to be called once per page activation rather than on every mutation,
   * since individual write operations keep the signal in sync incrementally.
   *
   * @returns Observable that emits the full `ProfileDto[]` array on success.
   */
  loadProfiles(): Observable<ProfileDto[]> {
    return this.http.get<ProfileDto[]>(this.base).pipe(
      tap(list => this.profiles.set(list))
    );
  }

  /**
   * Creates a new profile and appends it to the tail of the `profiles` signal.
   *
   * @param req - Profile data to persist.
   * @returns Observable that emits the created `ProfileDto` (with server-assigned id).
   */
  create(req: CreateProfileRequest): Observable<ProfileDto> {
    return this.http.post<ProfileDto>(this.base, req).pipe(
      tap(profile => this.profiles.update(list => [...list, profile]))
    );
  }

  /**
   * Performs a full replacement of an existing profile via HTTP PUT and splices
   * the updated record into the `profiles` signal in-place, preserving list order.
   *
   * @param id  - UUID of the profile to replace.
   * @param req - Replacement profile data.
   * @returns Observable that emits the updated `ProfileDto` returned by the server.
   */
  update(id: string, req: UpdateProfileRequest): Observable<ProfileDto> {
    return this.http.put<ProfileDto>(`${this.base}/${id}`, req).pipe(
      tap(updated => this.profiles.update(list =>
        list.map(p => p.id === id ? updated : p)
      ))
    );
  }

  /**
   * Deletes a profile by ID and removes it from the `profiles` signal.
   *
   * @param id - UUID of the profile to delete.
   * @returns Observable that completes without emitting a value on success.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => this.profiles.update(list => list.filter(p => p.id !== id)))
    );
  }
}

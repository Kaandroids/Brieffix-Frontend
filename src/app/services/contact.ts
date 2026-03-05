/**
 * @file contact.ts
 * @description Service and associated types for managing recipient contacts in Briefix.
 *
 * A "contact" represents a letter recipient — either an individual person or a
 * legal organisation. Contacts are stored per user and can be selected during
 * letter composition to automatically populate recipient address fields, reducing
 * manual data entry.
 *
 * The service maintains a reactive `contacts` signal that is updated in-place
 * after each mutation, avoiding superfluous API round-trips.
 */

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

/**
 * Full representation of a contact record as returned by the API.
 *
 * The shape accommodates both individual and organisation contacts; fields
 * irrelevant to the selected `type` may be absent.
 *
 * @property id                       - Server-assigned UUID.
 * @property userId                   - UUID of the owning user account.
 * @property type                     - Discriminates between a natural person and a
 *                                      legal entity, controlling which address fields
 *                                      are displayed and relevant.
 * @property companyName              - Legal entity name; applicable to `ORGANIZATION` contacts.
 * @property contactPerson            - Named representative within an organisation.
 * @property contactPersonSalutation  - Salutation for the contact person (e.g. "Herr").
 * @property department               - Department or business unit.
 * @property firstName                - Given name; applicable to `INDIVIDUAL` contacts.
 * @property lastName                 - Family name; applicable to `INDIVIDUAL` contacts.
 * @property salutation               - Greeting prefix for an individual (e.g. "Frau").
 * @property street                   - Street name component of the postal address.
 * @property streetNumber             - Building number component of the postal address.
 * @property postalCode               - Postal / ZIP code.
 * @property city                     - City or locality.
 * @property country                  - Country name or code.
 * @property email                    - Contact email address.
 * @property phone                    - Contact telephone number.
 * @property createdAt                - ISO 8601 creation timestamp.
 */
export interface ContactDto {
  id: string;
  userId: string;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  companyName?: string;
  contactPerson?: string;
  contactPersonSalutation?: string;
  department?: string;
  firstName?: string;
  lastName?: string;
  salutation?: string;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
}

/**
 * Request body for creating a new contact.
 *
 * Mirrors `ContactDto` minus the server-generated fields (`id`, `userId`,
 * `createdAt`). Field semantics are identical to `ContactDto`.
 */
export interface CreateContactRequest {
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  companyName?: string;
  contactPerson?: string;
  contactPersonSalutation?: string;
  department?: string;
  firstName?: string;
  lastName?: string;
  salutation?: string;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
}

/**
 * Request body for a full contact replacement (HTTP PUT).
 *
 * Structurally identical to `CreateContactRequest`; typed as an alias to signal
 * intent at call sites and to allow independent evolution if the two shapes diverge.
 */
export type UpdateContactRequest = CreateContactRequest;

/**
 * Root-provided singleton service for CRUD operations on recipient contacts.
 *
 * Maintains a reactive `contacts` signal that acts as a client-side cache.
 * Mutation methods update the signal after a confirmed API response, ensuring
 * the UI reflects the authoritative server state rather than an optimistic guess.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  /** Base URL prefix for contact API endpoints. */
  private readonly base = '/api/v1/contacts';
  private http = inject(HttpClient);

  /**
   * Reactive signal containing the current user's list of contacts.
   * Initialised as an empty array; populated by `loadContacts`.
   */
  contacts = signal<ContactDto[]>([]);

  /**
   * Fetches all contacts belonging to the authenticated user and replaces the
   * `contacts` signal with the server-returned list.
   *
   * @returns Observable that emits the full `ContactDto[]` array on success.
   */
  loadContacts(): Observable<ContactDto[]> {
    return this.http.get<ContactDto[]>(this.base).pipe(
      tap(list => this.contacts.set(list))
    );
  }

  /**
   * Creates a new contact and appends it to the tail of the `contacts` signal.
   *
   * @param req - Contact data to persist.
   * @returns Observable that emits the created `ContactDto` (with server-assigned id).
   */
  create(req: CreateContactRequest): Observable<ContactDto> {
    return this.http.post<ContactDto>(this.base, req).pipe(
      tap(c => this.contacts.update(list => [...list, c]))
    );
  }

  /**
   * Performs a full replacement of an existing contact via HTTP PUT and splices
   * the updated record into the `contacts` signal in-place, preserving list order.
   *
   * @param id  - UUID of the contact to replace.
   * @param req - Replacement contact data.
   * @returns Observable that emits the updated `ContactDto` returned by the server.
   */
  update(id: string, req: UpdateContactRequest): Observable<ContactDto> {
    return this.http.put<ContactDto>(`${this.base}/${id}`, req).pipe(
      tap(updated => this.contacts.update(list =>
        list.map(c => c.id === id ? updated : c)
      ))
    );
  }

  /**
   * Deletes a contact by ID and removes it from the `contacts` signal.
   *
   * @param id - UUID of the contact to delete.
   * @returns Observable that completes without emitting a value on success.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => this.contacts.update(list => list.filter(c => c.id !== id)))
    );
  }
}

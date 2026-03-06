/**
 * @file contacts.ts
 * @description Standalone component for managing the authenticated user's recipient contacts.
 *
 * Provides a full CRUD interface: listing contacts, creating new entries, editing
 * existing records inline, and deleting contacts. The form handles both `INDIVIDUAL`
 * and `ORGANIZATION` contact types, conditionally surfacing fields relevant to each
 * (e.g. company name and contact person for organisations; salutation and personal
 * name for individuals).
 *
 * A single `FormGroup` is shared between create and edit operations; the `editingContact`
 * signal determines which `ContactService` method is called on submission.
 */

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ContactDto, ContactService } from '../../services/contact';

/**
 * Standalone page component for recipient contact management.
 *
 * `contacts` is a direct reference to the `ContactService` reactive signal so that
 * the template automatically reflects mutations without requiring explicit change detection.
 */
@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss'
})
export class Contacts implements OnInit {
  private contactService = inject(ContactService);
  private fb = inject(FormBuilder);
  private title = inject(Title);

  /** Direct reference to the `ContactService` reactive signal; binds the template to live data. */
  contacts = this.contactService.contacts;

  /** Controls the visibility of the create/edit form panel. */
  formOpen = signal(false);

  /**
   * Holds the contact currently being edited, or `null` when the form is in create mode.
   * Determines which `ContactService` method is called on submission.
   */
  editingContact = signal<ContactDto | null>(null);

  /** Tracks whether a save request is in flight; used to disable the submit button. */
  loading = signal(false);

  /**
   * Shared reactive form used for both creating and editing contacts.
   *
   * All optional fields are pre-initialised to empty strings to ensure consistent
   * dirty/pristine tracking. `type` defaults to `'INDIVIDUAL'` as the most common case.
   */
  form = this.fb.group({
    type: ['INDIVIDUAL' as 'INDIVIDUAL' | 'ORGANIZATION', Validators.required],
    salutation: [''],
    firstName: [''],
    lastName: [''],
    companyName: [''],
    contactPersonSalutation: [''],
    contactPerson: [''],
    department: [''],
    street: [''],
    streetNumber: [''],
    postalCode: [''],
    city: [''],
    country: [''],
    email: [''],
    phone: ['']
  });

  /**
   * Derived boolean reflecting whether the form is currently configured for an
   * organisation contact. Controls conditional rendering of organisation-specific fields.
   */
  get isOrganization(): boolean {
    return this.form.get('type')?.value === 'ORGANIZATION';
  }

  /**
   * Programmatically sets the contact type control, enabling template buttons to
   * switch between `INDIVIDUAL` and `ORGANIZATION` without direct form model access.
   *
   * @param type - The contact type to apply to the `type` control.
   */
  setType(type: 'INDIVIDUAL' | 'ORGANIZATION'): void {
    this.form.get('type')?.setValue(type);
    // Clear fields that belong to the other type to prevent ghost data in the address
    if (type === 'ORGANIZATION') {
      this.form.patchValue({ salutation: '', firstName: '', lastName: '' });
    } else {
      this.form.patchValue({ companyName: '', contactPerson: '', contactPersonSalutation: '', department: '' });
    }
  }

  /**
   * Sets the page title and fetches the current user's contact list on route activation.
   */
  ngOnInit(): void {
    this.title.setTitle('Contacts — Brief-Fix');
    this.contactService.loadContacts().subscribe();
  }

  /**
   * Opens the form panel in create mode by clearing editing state and resetting
   * the form to its default values.
   */
  openCreate(): void {
    this.editingContact.set(null);
    this.form.reset({ type: 'INDIVIDUAL' });
    this.formOpen.set(true);
  }

  /**
   * Opens the form panel in edit mode, populating all fields from the selected
   * contact DTO. Null-coalescences prevent optional fields from rendering as "null".
   *
   * @param contact - The `ContactDto` to load into the form for editing.
   */
  openEdit(contact: ContactDto): void {
    this.editingContact.set(contact);
    this.form.patchValue({
      type: contact.type,
      salutation: contact.salutation ?? '',
      firstName: contact.firstName ?? '',
      lastName: contact.lastName ?? '',
      companyName: contact.companyName ?? '',
      contactPersonSalutation: contact.contactPersonSalutation ?? '',
      contactPerson: contact.contactPerson ?? '',
      department: contact.department ?? '',
      street: contact.street ?? '',
      streetNumber: contact.streetNumber ?? '',
      postalCode: contact.postalCode ?? '',
      city: contact.city ?? '',
      country: contact.country ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? ''
    });
    this.formOpen.set(true);
  }

  /**
   * Closes the form panel and resets all form state and editing context.
   * Called both on explicit cancel and after a successful save.
   */
  closeForm(): void {
    this.formOpen.set(false);
    this.editingContact.set(null);
    this.form.reset({ type: 'INDIVIDUAL' });
  }

  /**
   * Handles form submission for both create and edit operations.
   *
   * The observable is selected at runtime based on `editingContact`: a non-null
   * value routes to `ContactService.update`; a null value routes to
   * `ContactService.create`. This avoids duplicating subscribe/error logic.
   *
   * The `as any` cast on the form value is intentional: `FormGroup.value` produces
   * a partial type that does not exactly match the request interfaces, but the form
   * structure is aligned with `CreateContactRequest`/`UpdateContactRequest`.
   */
  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value as any;
    const editing = this.editingContact();

    // Select the appropriate service method based on whether we are editing or creating.
    const obs = editing
      ? this.contactService.update(editing.id, val)
      : this.contactService.create(val);

    obs.subscribe({
      next: () => { this.loading.set(false); this.closeForm(); },
      error: () => { this.loading.set(false); }
    });
  }

  /**
   * Deletes a contact by ID. The `ContactService` signal is updated reactively
   * on success, so no explicit list refresh is required.
   *
   * @param id - UUID of the contact to delete.
   */
  deleteContact(id: string): void {
    this.contactService.delete(id).subscribe();
  }

  /**
   * Resolves a display-friendly name for a contact based on its type.
   *
   * For organisation contacts, returns the company name or an em-dash if absent.
   * For individual contacts, joins first and last name, falling back to an em-dash
   * if neither field is populated.
   *
   * @param c - The `ContactDto` to derive a display name from.
   * @returns A human-readable contact name string.
   */
  displayName(c: ContactDto): string {
    if (c.type === 'ORGANIZATION') return c.companyName ?? '—';
    return [c.firstName, c.lastName].filter(v => !!v).join(' ') || '—';
  }

  /**
   * Formats the postal address fields of a contact into a compact summary string.
   *
   * Filters out falsy values to avoid producing malformed strings when optional
   * address components are absent.
   *
   * @param c - The `ContactDto` whose address fields should be formatted.
   * @returns A comma-separated address summary string, e.g. `"10115, Berlin, Deutschland"`.
   */
  formatAddress(c: ContactDto): string {
    return [c.postalCode, c.city, c.country].filter(v => !!v).join(', ');
  }
}

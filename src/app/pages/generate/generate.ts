import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PublicLetterService } from '../../services/public-letter';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

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

  loading        = signal(false);
  previewLoading = signal(false);
  previewUrl     = signal<SafeResourceUrl | null>(null);
  error          = signal('');
  rateLimited    = signal(false);
  success        = signal(false);

  senderType    = signal<'INDIVIDUAL' | 'ORGANIZATION'>('INDIVIDUAL');
  recipientType = signal<'INDIVIDUAL' | 'ORGANIZATION'>('INDIVIDUAL');

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

  setSenderType(type: 'INDIVIDUAL' | 'ORGANIZATION') {
    this.senderType.set(type);
    if (type === 'INDIVIDUAL') {
      this.form.patchValue({ senderCompanyName: '', senderDepartment: '', senderContactPerson: '' });
    } else {
      this.form.patchValue({ senderTitle: '', senderFirstName: '', senderLastName: '' });
    }
  }

  setRecipientType(type: 'INDIVIDUAL' | 'ORGANIZATION') {
    this.recipientType.set(type);
    if (type === 'INDIVIDUAL') {
      this.form.patchValue({ recipientCompany: '', recipientDepartment: '', recipientContactPerson: '', recipientContactPersonSalutation: '' });
    } else {
      this.form.patchValue({ recipientSalutation: '', recipientFirstName: '', recipientLastName: '' });
    }
  }

  openPreviewModal() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.previewUrl.set(null);
    this.previewLoading.set(true);
    this.error.set('');
    this.rateLimited.set(false);

    this.publicLetterService.preview(this.buildRequest()).subscribe({
      next: (blob) => {
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

  closePreview() {
    this.previewUrl.set(null);
  }

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
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      error: (err) => {
        this.loading.set(false);
        this.handleError(err);
      }
    });
  }

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

  private handleError(err: any) {
    if (err.status === 429) {
      this.rateLimited.set(true);
    } else {
      this.error.set('Fehler beim Erstellen des Briefes. Bitte versuchen Sie es erneut.');
    }
  }

  get f() { return this.form.controls; }
}

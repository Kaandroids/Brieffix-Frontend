import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicLetterPreviewRequest {
  // Sender
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
  // Recipient
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
  // Content
  title: string;
  body: string;
  letterDate?: string;
}

@Injectable({ providedIn: 'root' })
export class PublicLetterService {
  private http = inject(HttpClient);

  preview(req: PublicLetterPreviewRequest): Observable<Blob> {
    return this.http.post('/api/v1/public/letter-preview', req, { responseType: 'blob' });
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiLetterResponse {
  title:   string | null;
  content: string | null;
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private base = '/api/v1/ai';

  generateLetter(
    description: string,
    profileId?: string | null,
    contactId?: string | null
  ): Observable<AiLetterResponse> {
    return this.http.post<AiLetterResponse>(`${this.base}/generate-letter`, {
      description,
      profileId: profileId || null,
      contactId: contactId || null,
    });
  }
}

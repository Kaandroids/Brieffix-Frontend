/**
 * @file ai.ts
 * @description Service for AI-assisted letter generation via the Briefix backend.
 *
 * Delegates generation requests to the backend's `/api/v1/ai/generate-letter`
 * endpoint, which in turn calls the Google Gemini API (`gemini-2.5-flash`) with
 * a structured prompt. The backend returns only the letter body (salutation
 * onward) — no address block, date, or subject line — making the response
 * suitable for direct insertion into the letter composition form.
 *
 * Optional `profileId` and `contactId` parameters allow the backend to tailor
 * the generated content to the specific sender and recipient context.
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Shape of the AI letter generation response returned by the backend.
 *
 * @property title   - A suggested letter subject line, or `null` if generation failed.
 * @property content - The generated letter body (starting from the salutation),
 *                     or `null` if generation failed.
 * @property success - `false` only when the provided description is completely
 *                     nonsensical or cannot be interpreted as a letter intent;
 *                     `true` in all other cases, including partial results.
 */
export interface AiLetterResponse {
  title:   string | null;
  content: string | null;
  success: boolean;
}

/**
 * Root-provided singleton service that exposes the AI letter generation capability.
 *
 * Stateless by design — no signals or caches are maintained. Each call to
 * `generateLetter` produces an independent HTTP request and emits a single
 * `AiLetterResponse`. All retry and error-display logic is the responsibility
 * of the calling component.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);

  /** Base URL prefix for AI-related API endpoints. */
  private base = '/api/v1/ai';

  /**
   * Requests an AI-generated letter body from the backend Gemini integration.
   *
   * The backend uses the optional `profileId` and `contactId` to provide
   * sender and recipient context to the language model, improving the relevance
   * and formality of the generated text.
   *
   * @param description - A free-text description of the letter's purpose and content,
   *                      provided by the user (may include voice-transcribed input).
   * @param profileId   - Optional UUID of the sender profile to include as context.
   * @param contactId   - Optional UUID of the recipient contact to include as context.
   * @returns Observable that emits a single `AiLetterResponse` on completion.
   */
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

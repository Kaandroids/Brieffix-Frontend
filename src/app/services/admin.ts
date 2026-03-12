import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthProvider, UserPlan, UserRole } from './user';

export interface AdminUserDto {
  id: string;
  email: string;
  fullName: string;
  provider: AuthProvider;
  plan: UserPlan;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base = '/api/v1/admin';
  private http = inject(HttpClient);

  getUsers(emailFilter: string, page: number, size: number): Observable<PageResponse<AdminUserDto>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (emailFilter.trim()) {
      params = params.set('email', emailFilter.trim());
    }
    return this.http.get<PageResponse<AdminUserDto>>(`${this.base}/users`, { params });
  }

  updateUser(id: string, role: UserRole, plan: UserPlan): Observable<AdminUserDto> {
    return this.http.patch<AdminUserDto>(`${this.base}/users/${id}`, { role, plan });
  }
}

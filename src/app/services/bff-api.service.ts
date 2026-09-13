import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthenticatedUserResponse {
  authenticated: boolean;
  username: string;
  name: string;
  roles: string[];
  audience: string[];
  issuer: string;
}

export interface AdminResponse {
  authorized: boolean;
  requiredRole: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class BffApiService {
  private readonly http = inject(HttpClient);

  getCurrentUser(): Observable<AuthenticatedUserResponse> {
    return this.http.get<AuthenticatedUserResponse>(
      `${environment.apiUrl}/secure/me`,
    );
  }

  getAdminStatus(): Observable<AdminResponse> {
    return this.http.get<AdminResponse>(
      `${environment.apiUrl}/admin/status`,
    );
  }
}
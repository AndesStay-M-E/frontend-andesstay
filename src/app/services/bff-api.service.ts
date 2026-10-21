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

// Debe coincidir con el enum ReservationStatus de ms-andesstay-reservations.
export type ReservationStatus =
  | 'CREADA'
  | 'CONFIRMADA'
  | 'CHECKIN_PENDIENTE'
  | 'EN_ESTADIA'
  | 'CHECKOUT'
  | 'CANCELADA';

export interface ReservationRequest {
  accommodationId: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
}

export interface ReservationResponse {
  id: number;
  userEmail: string;
  accommodationId: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
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

  getMyReservations(): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(
      `${environment.apiUrl}/reservations/me`,
    );
  }

  getAllReservations(): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(
      `${environment.apiUrl}/reservations`,
    );
  }

  getReservationById(id: number): Observable<ReservationResponse> {
    return this.http.get<ReservationResponse>(
      `${environment.apiUrl}/reservations/${id}`,
    );
  }

  createReservation(
    request: ReservationRequest,
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(
      `${environment.apiUrl}/reservations`,
      request,
    );
  }

  updateReservation(
    id: number,
    request: ReservationRequest,
  ): Observable<ReservationResponse> {
    return this.http.put<ReservationResponse>(
      `${environment.apiUrl}/reservations/${id}`,
      request,
    );
  }

  confirmReservation(id: number): Observable<ReservationResponse> {
    return this.http.patch<ReservationResponse>(
      `${environment.apiUrl}/reservations/${id}/confirm`,
      {},
    );
  }

  updateReservationStatus(
    id: number,
    status: ReservationStatus,
  ): Observable<ReservationResponse> {
    return this.http.put<ReservationResponse>(
      `${environment.apiUrl}/reservations/${id}/status`,
      { status },
    );
  }

  cancelReservation(id: number): Observable<ReservationResponse> {
    return this.http.patch<ReservationResponse>(
      `${environment.apiUrl}/reservations/${id}/cancel`,
      {},
    );
  }
}
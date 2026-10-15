import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReservationStatus } from './bff-api.service';

export interface AuditEvent {
  id: number;
  eventId: string;
  reservationId: number;
  userEmail: string | null;
  accommodationId: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  previousStatus: ReservationStatus | null;
  newStatus: ReservationStatus;
  occurredAt: string;
  receivedAt: string;
  traceId: string | null;
}

export interface AuditSummary {
  totalEvents: number;
  reservations: number;
  eventsByStatus: Record<ReservationStatus, number>;
  lastEventAt: string | null;
}

export interface AuditFilters {
  reservationId?: number | null;
  status?: ReservationStatus | '';
  userEmail?: string;
  limit?: number;
}

/**
 * Llamadas a auditoría a través del BFF (/api/audit/**).
 */
@Injectable({
  providedIn: 'root',
})
export class AuditApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audit`;

  getEvents(filters: AuditFilters): Observable<AuditEvent[]> {
    let params = new HttpParams().set('limit', filters.limit ?? 100);

    if (filters.reservationId) {
      params = params.set('reservationId', filters.reservationId);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.userEmail?.trim()) {
      params = params.set('userEmail', filters.userEmail.trim());
    }

    return this.http.get<AuditEvent[]>(`${this.baseUrl}/events`, { params });
  }

  getTimeline(reservationId: number): Observable<AuditEvent[]> {
    return this.http.get<AuditEvent[]>(
      `${this.baseUrl}/reservations/${reservationId}/timeline`,
    );
  }

  getSummary(): Observable<AuditSummary> {
    return this.http.get<AuditSummary>(`${this.baseUrl}/summary`);
  }
}

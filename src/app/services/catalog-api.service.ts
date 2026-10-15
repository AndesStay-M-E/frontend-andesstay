import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AccommodationType =
  | 'HABITACION'
  | 'SUITE'
  | 'CABANA'
  | 'DEPARTAMENTO';

export interface AccommodationRequest {
  name: string;
  type: AccommodationType;
  location: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  active: boolean;
}

export interface Accommodation extends AccommodationRequest {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'PENDIENTE' | 'COMPLETADO';
export type HousekeepingAction = 'PREPARE_ROOM' | 'CLEAN_ROOM';

export interface HousekeepingTicket {
  id: number;
  code: string;
  reservationId: number;
  accommodationId: number;
  accommodationName: string | null;
  action: HousekeepingAction;
  checkInDate: string;
  checkOutDate: string;
  status: TicketStatus;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Llamadas al catálogo a través del BFF (/api/catalog/**).
 */
@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/catalog`;

  getAccommodations(onlyActive = false): Observable<Accommodation[]> {
    const params = new HttpParams().set('onlyActive', onlyActive);

    return this.http.get<Accommodation[]>(
      `${this.baseUrl}/accommodations`,
      { params },
    );
  }

  createAccommodation(
    request: AccommodationRequest,
  ): Observable<Accommodation> {
    return this.http.post<Accommodation>(
      `${this.baseUrl}/accommodations`,
      request,
    );
  }

  updateAccommodation(
    id: number,
    request: AccommodationRequest,
  ): Observable<Accommodation> {
    return this.http.put<Accommodation>(
      `${this.baseUrl}/accommodations/${id}`,
      request,
    );
  }

  deactivateAccommodation(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/accommodations/${id}`,
    );
  }

  getTickets(status?: TicketStatus): Observable<HousekeepingTicket[]> {
    let params = new HttpParams();

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<HousekeepingTicket[]>(
      `${this.baseUrl}/housekeeping-tickets`,
      { params },
    );
  }

  completeTicket(id: number): Observable<HousekeepingTicket> {
    return this.http.patch<HousekeepingTicket>(
      `${this.baseUrl}/housekeeping-tickets/${id}/complete`,
      {},
    );
  }
}

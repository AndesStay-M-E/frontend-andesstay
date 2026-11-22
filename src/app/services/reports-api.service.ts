import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReservationStatus } from './bff-api.service';

export type DocumentType = 'RESERVATION_VOUCHER' | 'BOLETA';

export interface Voucher {
  id: number;
  code: string;
  reservationId: number;
  recipient: string;
  documentType: DocumentType;
  generatedAt: string;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface ReportSummary {
  totalVouchers: number;
  vouchersToday: number;
  distinctRecipients: number;
  lastVoucherAt: string | null;
  lastSevenDays: DailyCount[];
}

/* ===================== KPIs por streaming (Kafka) ===================== */

export type KpiRange = 'last24h' | 'last7d' | 'last30d';

export interface HourlyCount {
  hour: string;
  count: number;
}

/** Estado del consumo desde Kafka (último evento leído). */
export interface StreamStatus {
  eventsConsumed: number;
  lastEventAt: string | null;
  lastReceivedAt: string | null;
  lastPartition: number | null;
  lastOffset: number | null;
}

export interface KpiResponse {
  range: KpiRange;
  from: string;
  to: string;
  reservationsCreated: number;
  reservationsConfirmed: number;
  reservationsCancelled: number;
  checkouts: number;
  confirmedAmount: number;
  averageConfirmationMinutes: number | null;
  averageCycleMinutes: number | null;
  activeOccupancy: number;
  pendingCheckins: number;
  reservationsByHour: HourlyCount[];
  stream: StreamStatus;
}

export interface TopUnit {
  accommodationId: number;
  reservations: number;
}

/** Acción leída desde el tópico audit.timeline. */
export interface ActivityEntry {
  reservationId: number;
  action: ReservationStatus;
  previousStatus: ReservationStatus | null;
  description: string;
  performedBy: string | null;
  performedRole: string | null;
  sourceIp: string | null;
  occurredAt: string;
  partition: number;
  offset: number;
}

/**
 * Llamadas a reportería a través del BFF (/api/reports/**).
 */
@Injectable({
  providedIn: 'root',
})
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  getSummary(): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.baseUrl}/summary`);
  }

  getVouchers(reservationId?: number | null): Observable<Voucher[]> {
    let params = new HttpParams();

    if (reservationId) {
      params = params.set('reservationId', reservationId);
    }

    return this.http.get<Voucher[]>(`${this.baseUrl}/vouchers`, { params });
  }

  getKpis(range: KpiRange): Observable<KpiResponse> {
    const params = new HttpParams().set('range', range);
    return this.http.get<KpiResponse>(`${this.baseUrl}/kpis`, { params });
  }

  getTopUnits(range: KpiRange, limit = 5): Observable<TopUnit[]> {
    const params = new HttpParams().set('range', range).set('limit', limit);
    return this.http.get<TopUnit[]>(`${this.baseUrl}/top-units`, { params });
  }

  getActivity(limit = 10): Observable<ActivityEntry[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ActivityEntry[]>(`${this.baseUrl}/activity`, { params });
  }
}

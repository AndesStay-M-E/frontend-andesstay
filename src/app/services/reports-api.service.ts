import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Voucher {
  id: number;
  code: string;
  reservationId: number;
  recipient: string;
  documentType: string;
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
}

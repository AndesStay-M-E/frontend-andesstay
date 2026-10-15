import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  ReportSummary,
  ReportsApiService,
  Voucher,
} from '../../services/reports-api.service';
import { httpErrorMessage } from '../../shared/http-error';

interface ChartBar {
  date: string;
  label: string;
  count: number;
  heightPercent: number;
  isToday: boolean;
}

/**
 * Reportería de vouchers (solo ADMIN).
 */
@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  readonly summary = signal<ReportSummary | null>(null);
  readonly vouchers = signal<Voucher[]>([]);
  readonly loadingSummary = signal(false);
  readonly loadingVouchers = signal(false);
  readonly errorMessage = signal('');

  reservationFilter: number | null = null;

  /** Barras del gráfico: altura relativa al día con más vouchers. */
  readonly bars = computed<ChartBar[]>(() => {
    const days = this.summary()?.lastSevenDays ?? [];
    const max = Math.max(1, ...days.map((d) => d.count));

    return days.map((day, index) => ({
      date: day.date,
      label: index === days.length - 1 ? 'Hoy' : this.shortDate(day.date),
      count: day.count,
      heightPercent: (day.count / max) * 100,
      isToday: index === days.length - 1,
    }));
  });

  readonly weekTotal = computed(() =>
    this.bars().reduce((total, bar) => total + bar.count, 0),
  );

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadSummary();
    this.loadVouchers();
  }

  loadSummary(): void {
    this.loadingSummary.set(true);

    this.reportsApi
      .getSummary()
      .pipe(finalize(() => this.loadingSummary.set(false)))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: (error) =>
          this.errorMessage.set(
            httpErrorMessage(error, 'No fue posible cargar el resumen.'),
          ),
      });
  }

  loadVouchers(): void {
    this.errorMessage.set('');
    this.loadingVouchers.set(true);

    this.reportsApi
      .getVouchers(this.reservationFilter)
      .pipe(finalize(() => this.loadingVouchers.set(false)))
      .subscribe({
        next: (vouchers) => this.vouchers.set(vouchers),
        error: (error) =>
          this.errorMessage.set(
            httpErrorMessage(error, 'No fue posible cargar los vouchers.'),
          ),
      });
  }

  clearFilter(): void {
    this.reservationFilter = null;
    this.loadVouchers();
  }

  private shortDate(isoDate: string): string {
    const [, month, day] = isoDate.split('-');
    return `${day}/${month}`;
  }
}

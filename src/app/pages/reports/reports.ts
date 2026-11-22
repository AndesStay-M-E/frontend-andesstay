import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, finalize, forkJoin } from 'rxjs';

import { CatalogApiService } from '../../services/catalog-api.service';
import {
  ActivityEntry,
  DocumentType,
  KpiRange,
  KpiResponse,
  ReportSummary,
  ReportsApiService,
  TopUnit,
  Voucher,
} from '../../services/reports-api.service';
import { httpErrorMessage } from '../../shared/http-error';
import { reservationStatusBadge, reservationStatusLabel, roleLabel } from '../../shared/labels';

interface ChartBar {
  key: string;
  label: string;
  count: number;
  heightPercent: number;
  highlight: boolean;
}

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  RESERVATION_VOUCHER: 'Voucher de reserva',
  BOLETA: 'Boleta',
};

/** Cada cuánto se vuelve a consultar el panel en vivo (milisegundos). */
const LIVE_REFRESH_MS = 5000;

/**
 * Reportería (solo ADMIN).
 *
 * - Panel en vivo: KPIs que el microservicio report calcula leyendo los
 *   tópicos de Kafka reservations.events y audit.timeline.
 * - Vouchers y boletas: los genera report al consumir la cola q.cmd.voucher
 *   de RabbitMQ.
 *
 * Los datos técnicos (partición, offset, eventos consumidos) siguen llegando
 * en la respuesta, pero no se muestran: se revisan en Kafka UI o kafka-admin.
 */
@Component({
  selector: 'app-reports',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit, OnDestroy {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly catalogApi = inject(CatalogApiService);

  readonly statusLabel = reservationStatusLabel;
  readonly statusBadge = reservationStatusBadge;
  readonly roleName = roleLabel;

  readonly ranges: { value: KpiRange; label: string }[] = [
    { value: 'last24h', label: 'Últimas 24 horas' },
    { value: 'last7d', label: 'Últimos 7 días' },
    { value: 'last30d', label: 'Últimos 30 días' },
  ];

  // ---------- Panel en vivo (Kafka) ----------
  readonly kpis = signal<KpiResponse | null>(null);
  readonly topUnits = signal<TopUnit[]>([]);
  readonly activity = signal<ActivityEntry[]>([]);
  readonly liveLoading = signal(false);
  readonly liveError = signal('');
  readonly lastUpdate = signal<Date | null>(null);
  readonly unitNames = signal<Record<number, string>>({});

  range: KpiRange = 'last24h';
  autoRefresh = true;
  private timer: ReturnType<typeof setInterval> | null = null;
  private liveRequest: Subscription | null = null;

  // ---------- Vouchers (RabbitMQ) ----------
  readonly summary = signal<ReportSummary | null>(null);
  readonly vouchers = signal<Voucher[]>([]);
  readonly loadingSummary = signal(false);
  readonly loadingVouchers = signal(false);
  readonly errorMessage = signal('');

  reservationFilter: number | null = null;

  /** 24 barras: reservas creadas en cada hora de las últimas 24 horas. */
  readonly hourBars = computed<ChartBar[]>(() => {
    const hours = this.kpis()?.reservationsByHour ?? [];
    const max = Math.max(1, ...hours.map((h) => h.count));

    return hours.map((h, index) => ({
      key: h.hour,
      label: String(new Date(h.hour).getHours()).padStart(2, '0') + 'h',
      count: h.count,
      heightPercent: (h.count / max) * 100,
      highlight: index === hours.length - 1,
    }));
  });

  /** Barras de vouchers por día (últimos 7 días). */
  readonly dayBars = computed<ChartBar[]>(() => {
    const days = this.summary()?.lastSevenDays ?? [];
    const max = Math.max(1, ...days.map((d) => d.count));

    return days.map((day, index) => ({
      key: day.date,
      label: index === days.length - 1 ? 'Hoy' : this.shortDate(day.date),
      count: day.count,
      heightPercent: (day.count / max) * 100,
      highlight: index === days.length - 1,
    }));
  });

  readonly weekTotal = computed(() =>
    this.dayBars().reduce((total, bar) => total + bar.count, 0),
  );

  readonly maxUnitReservations = computed(() =>
    Math.max(1, ...this.topUnits().map((u) => u.reservations)),
  );

  ngOnInit(): void {
    this.loadUnitNames();
    this.loadLive();
    this.refreshVouchers();
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.liveRequest?.unsubscribe();
  }

  /* ===================== Panel en vivo ===================== */

  /**
   * Consulta KPIs, unidades más demandadas y última actividad en paralelo.
   * force = true cancela la consulta anterior (por ejemplo al cambiar el rango).
   */
  loadLive(force = false): void {
    const waiting = this.liveRequest !== null && !this.liveRequest.closed;

    // Si la consulta anterior todavía no responde, no se lanza otra.
    if (waiting && !force) {
      return;
    }

    this.liveRequest?.unsubscribe();
    this.liveLoading.set(true);

    this.liveRequest = forkJoin({
      kpis: this.reportsApi.getKpis(this.range),
      units: this.reportsApi.getTopUnits(this.range, 5),
      activity: this.reportsApi.getActivity(10),
    })
      .pipe(finalize(() => this.liveLoading.set(false)))
      .subscribe({
        next: ({ kpis, units, activity }) => {
          this.kpis.set(kpis);
          this.topUnits.set(units);
          this.activity.set(activity);
          this.lastUpdate.set(new Date());
          this.liveError.set('');
        },
        error: (error) =>
          this.liveError.set(
            httpErrorMessage(error, 'No pudimos cargar los indicadores.'),
          ),
      });
  }

  changeRange(range: KpiRange): void {
    this.range = range;
    this.loadLive(true);
  }

  setAutoRefresh(enabled: boolean): void {
    this.autoRefresh = enabled;

    if (enabled) {
      this.startTimer();
      this.loadLive();
    } else {
      this.stopTimer();
    }
  }

  unitName(id: number): string {
    return this.unitNames()[id] ?? `Alojamiento #${id}`;
  }

  unitBarPercent(unit: TopUnit): number {
    return (unit.reservations / this.maxUnitReservations()) * 100;
  }

  /** 12.4 -> "12 min", 135 -> "2 h 15 min", null -> "—" */
  formatMinutes(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }

    const minutes = Math.round(value);

    if (minutes < 1) {
      return '< 1 min';
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    if (minutes < 60 * 24) {
      const rest = minutes % 60;
      return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
    }

    const days = Math.floor(minutes / (60 * 24));
    const hours = Math.floor((minutes % (60 * 24)) / 60);
    return hours === 0 ? `${days} d` : `${days} d ${hours} h`;
  }

  private startTimer(): void {
    this.stopTimer();

    if (this.autoRefresh) {
      this.timer = setInterval(() => this.loadLive(), LIVE_REFRESH_MS);
    }
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Nombres de los alojamientos para mostrar "Cabaña Volcán" en vez de "#3". */
  private loadUnitNames(): void {
    this.catalogApi.getAccommodations(false).subscribe({
      next: (accommodations) => {
        const names: Record<number, string> = {};
        accommodations.forEach((a) => (names[a.id] = a.name));
        this.unitNames.set(names);
      },
      // Si el catálogo falla, se muestran los números de alojamiento.
      error: () => this.unitNames.set({}),
    });
  }

  /* ===================== Vouchers ===================== */

  refreshVouchers(): void {
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
            httpErrorMessage(error, 'No pudimos cargar el resumen de documentos.'),
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
            httpErrorMessage(error, 'No pudimos cargar los vouchers y boletas.'),
          ),
      });
  }

  clearFilter(): void {
    this.reservationFilter = null;
    this.loadVouchers();
  }

  documentLabel(type: DocumentType): string {
    return DOCUMENT_LABELS[type] ?? type;
  }

  private shortDate(isoDate: string): string {
    const [, month, day] = isoDate.split('-');
    return `${day}/${month}`;
  }
}

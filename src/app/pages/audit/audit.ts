import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AuditApiService,
  AuditEvent,
  AuditFilters,
  AuditSummary,
} from '../../services/audit-api.service';
import { ReservationStatus } from '../../services/bff-api.service';
import { httpErrorMessage } from '../../shared/http-error';
import {
  RESERVATION_STATUSES,
  reservationStatusBadge,
  reservationStatusLabel,
} from '../../shared/labels';

/**
 * Auditoría y trazabilidad de reservas (ADMIN y AUDITOR).
 */
@Component({
  selector: 'app-audit',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
})
export class Audit implements OnInit {
  private readonly auditApi = inject(AuditApiService);

  readonly statuses = RESERVATION_STATUSES;
  readonly statusLabel = reservationStatusLabel;
  readonly statusBadge = reservationStatusBadge;

  readonly summary = signal<AuditSummary | null>(null);
  readonly events = signal<AuditEvent[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly timelineReservation = signal<number | null>(null);
  readonly timeline = signal<AuditEvent[]>([]);
  readonly loadingTimeline = signal(false);

  filters: AuditFilters = this.emptyFilters();

  ngOnInit(): void {
    this.loadSummary();
    this.search();
  }

  loadSummary(): void {
    this.auditApi.getSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: (error) =>
        this.errorMessage.set(
          httpErrorMessage(error, 'No fue posible cargar el resumen de auditoría.'),
        ),
    });
  }

  search(): void {
    this.errorMessage.set('');
    this.loading.set(true);

    this.auditApi
      .getEvents(this.filters)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (events) => this.events.set(events),
        error: (error) =>
          this.errorMessage.set(
            httpErrorMessage(error, 'No fue posible consultar la auditoría.'),
          ),
      });
  }

  filterByStatus(status: ReservationStatus): void {
    this.filters = { ...this.filters, status };
    this.search();
  }

  clearFilters(): void {
    this.filters = this.emptyFilters();
    this.search();
  }

  refresh(): void {
    this.loadSummary();
    this.search();

    const reservation = this.timelineReservation();
    if (reservation) {
      this.openTimeline(reservation);
    }
  }

  openTimeline(reservationId: number): void {
    this.timelineReservation.set(reservationId);
    this.loadingTimeline.set(true);

    this.auditApi
      .getTimeline(reservationId)
      .pipe(finalize(() => this.loadingTimeline.set(false)))
      .subscribe({
        next: (events) => this.timeline.set(events),
        error: (error) => {
          this.timeline.set([]);
          this.errorMessage.set(
            httpErrorMessage(error, 'No fue posible cargar la línea de tiempo.'),
          );
        },
      });
  }

  closeTimeline(): void {
    this.timelineReservation.set(null);
    this.timeline.set([]);
  }

  private emptyFilters(): AuditFilters {
    return {
      reservationId: null,
      status: '',
      userEmail: '',
      limit: 100,
    };
  }
}

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
  roleLabel,
} from '../../shared/labels';

/**
 * Auditoría y trazabilidad de reservas (ADMIN y AUDITOR).
 * Muestra qué cambió, quién lo hizo, cuándo y desde dónde (IP).
 * La partición/offset de Kafka y el traceId vienen en AuditEvent, pero no se muestran.
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
          httpErrorMessage(error, 'No pudimos cargar el resumen de auditoría.'),
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
            httpErrorMessage(error, 'No pudimos cargar el historial de cambios.'),
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
            httpErrorMessage(error, 'No pudimos cargar el historial de la reserva.'),
          );
        },
      });
  }

  closeTimeline(): void {
    this.timelineReservation.set(null);
    this.timeline.set([]);
  }

  /** "ana@andesstay.cl (Administrador)"; los eventos antiguos no traen quién lo hizo. */
  actorLabel(event: AuditEvent): string {
    if (!event.performedBy) {
      return '—';
    }

    return event.performedRole
      ? `${event.performedBy} (${roleLabel(event.performedRole)})`
      : event.performedBy;
  }

  private emptyFilters(): AuditFilters {
    return {
      reservationId: null,
      status: '',
      userEmail: '',
      from: '',
      to: '',
      limit: 100,
    };
  }
}

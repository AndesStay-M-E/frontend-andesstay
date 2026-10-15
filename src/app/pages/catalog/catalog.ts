import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { BffApiService } from '../../services/bff-api.service';
import {
  Accommodation,
  AccommodationRequest,
  CatalogApiService,
  HousekeepingTicket,
  TicketStatus,
} from '../../services/catalog-api.service';
import { httpErrorMessage } from '../../shared/http-error';
import {
  ACCOMMODATION_TYPES,
  accommodationTypeLabel,
  housekeepingActionLabel,
} from '../../shared/labels';

/**
 * Catálogo de alojamientos y tickets de limpieza (ADMIN y OPERADOR).
 * Solo ADMIN puede desactivar alojamientos.
 */
@Component({
  selector: 'app-catalog',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly bffApi = inject(BffApiService);

  readonly types = ACCOMMODATION_TYPES;
  readonly typeLabel = accommodationTypeLabel;
  readonly actionLabel = housekeepingActionLabel;

  readonly accommodations = signal<Accommodation[]>([]);
  readonly tickets = signal<HousekeepingTicket[]>([]);
  readonly isAdmin = signal(false);

  readonly loadingAccommodations = signal(false);
  readonly loadingTickets = signal(false);
  readonly saving = signal(false);

  readonly message = signal('');
  readonly errorMessage = signal('');

  readonly editingId = signal<number | null>(null);
  readonly ticketFilter = signal<TicketStatus | ''>('PENDIENTE');

  readonly activeCount = computed(
    () => this.accommodations().filter((a) => a.active).length,
  );

  readonly pendingCount = computed(
    () => this.tickets().filter((t) => t.status === 'PENDIENTE').length,
  );

  form: AccommodationRequest = this.emptyForm();

  ngOnInit(): void {
    this.bffApi.getCurrentUser().subscribe({
      next: (user) => this.isAdmin.set(user.roles.includes('ADMIN')),
      error: () => this.isAdmin.set(false),
    });

    this.loadAccommodations();
    this.loadTickets();
  }

  loadAccommodations(): void {
    this.loadingAccommodations.set(true);

    this.catalogApi
      .getAccommodations()
      .pipe(finalize(() => this.loadingAccommodations.set(false)))
      .subscribe({
        next: (accommodations) => this.accommodations.set(accommodations),
        error: (error) =>
          this.errorMessage.set(
            httpErrorMessage(error, 'No fue posible cargar el catálogo.'),
          ),
      });
  }

  loadTickets(): void {
    this.loadingTickets.set(true);

    this.catalogApi
      .getTickets(this.ticketFilter() || undefined)
      .pipe(finalize(() => this.loadingTickets.set(false)))
      .subscribe({
        next: (tickets) => this.tickets.set(tickets),
        error: (error) =>
          this.errorMessage.set(
            httpErrorMessage(error, 'No fue posible cargar los tickets.'),
          ),
      });
  }

  changeTicketFilter(status: TicketStatus | ''): void {
    this.ticketFilter.set(status);
    this.loadTickets();
  }

  save(): void {
    this.clearMessages();

    const validation = this.validateForm();
    if (validation) {
      this.errorMessage.set(validation);
      return;
    }

    const id = this.editingId();
    const request = id
      ? this.catalogApi.updateAccommodation(id, this.form)
      : this.catalogApi.createAccommodation(this.form);

    this.saving.set(true);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.message.set(
          id
            ? `Alojamiento "${saved.name}" actualizado.`
            : `Alojamiento "${saved.name}" creado con ID ${saved.id}.`,
        );
        this.cancelEdit();
        this.loadAccommodations();
      },
      error: (error) =>
        this.errorMessage.set(
          httpErrorMessage(error, 'No fue posible guardar el alojamiento.'),
        ),
    });
  }

  edit(accommodation: Accommodation): void {
    this.clearMessages();
    this.editingId.set(accommodation.id);
    this.form = {
      name: accommodation.name,
      type: accommodation.type,
      location: accommodation.location,
      description: accommodation.description ?? '',
      capacity: accommodation.capacity,
      pricePerNight: accommodation.pricePerNight,
      active: accommodation.active,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
  }

  deactivate(accommodation: Accommodation): void {
    const confirmed = window.confirm(
      `¿Desactivar "${accommodation.name}"? Ya no aparecerá para nuevas reservas.`,
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.catalogApi.deactivateAccommodation(accommodation.id).subscribe({
      next: () => {
        this.message.set(`Alojamiento "${accommodation.name}" desactivado.`);
        this.loadAccommodations();
      },
      error: (error) =>
        this.errorMessage.set(
          httpErrorMessage(error, 'No fue posible desactivar el alojamiento.'),
        ),
    });
  }

  completeTicket(ticket: HousekeepingTicket): void {
    this.clearMessages();

    this.catalogApi.completeTicket(ticket.id).subscribe({
      next: () => {
        this.message.set(`Ticket ${ticket.code} marcado como completado.`);
        this.loadTickets();
      },
      error: (error) =>
        this.errorMessage.set(
          httpErrorMessage(error, 'No fue posible completar el ticket.'),
        ),
    });
  }

  private validateForm(): string {
    const f = this.form;

    if (!f.name?.trim() || !f.location?.trim()) {
      return 'El nombre y la ubicación son obligatorios.';
    }

    if (!f.capacity || f.capacity < 1 || f.capacity > 20) {
      return 'La capacidad debe estar entre 1 y 20 huéspedes.';
    }

    if (!f.pricePerNight || f.pricePerNight <= 0) {
      return 'El precio por noche debe ser mayor que cero.';
    }

    return '';
  }

  private emptyForm(): AccommodationRequest {
    return {
      name: '',
      type: 'HABITACION',
      location: '',
      description: '',
      capacity: 2,
      pricePerNight: 50000,
      active: true,
    };
  }

  private clearMessages(): void {
    this.message.set('');
    this.errorMessage.set('');
  }
}

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  finalize,
  TimeoutError,
  timeout,
} from 'rxjs';

import {
  BffApiService,
  ReservationRequest,
  ReservationResponse,
  ReservationStatus,
} from '../../services/bff-api.service';
import {
  Accommodation,
  CatalogApiService,
} from '../../services/catalog-api.service';

@Component({
  selector: 'app-reservations',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './reservations.html',
  styleUrl: './reservations.scss',
})
export class Reservations implements OnInit {
  private readonly bffApi = inject(BffApiService);
  private readonly catalogApi = inject(CatalogApiService);

  /** Alojamientos activos del catálogo (si el catálogo no responde, queda vacío). */
  readonly accommodations = signal<Accommodation[]>([]);
  private readonly changeDetector = inject(ChangeDetectorRef);

  reservations: ReservationResponse[] = [];
  isAdmin = false;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  readonly today = new Date().toISOString().split('T')[0];

  form: ReservationRequest = this.emptyForm();

  ngOnInit(): void {
    this.loadUserAndReservations();
    this.loadAccommodations();
  }

  accommodationName(id: number): string {
    const found = this.accommodations().find((a) => a.id === id);
    return found ? found.name : `Alojamiento ${id}`;
  }

  private loadAccommodations(): void {
    this.catalogApi.getAccommodations(true).subscribe({
      next: (accommodations) => {
        this.accommodations.set(accommodations);

        if (
          accommodations.length > 0 &&
          !accommodations.some((a) => a.id === this.form.accommodationId)
        ) {
          this.form.accommodationId = accommodations[0].id;
        }
      },
      error: () => {
        this.accommodations.set([]);
        this.errorMessage = 'No fue posible cargar los alojamientos y sus precios. Intenta recargar la página.';
        this.changeDetector.markForCheck();
      },
    });
  }

  /** Precio oficial del alojamiento seleccionado, obtenido del catálogo. */
  get selectedAccommodation(): Accommodation | undefined {
    return this.accommodations().find(
      (item) => item.id === Number(this.form.accommodationId),
    );
  }

  /** Diferencia entre fechas UTC; no cambia al variar el horario de verano. */
  get nights(): number {
    if (!this.form.checkInDate || !this.form.checkOutDate) {
      return 0;
    }

    const start = Date.parse(`${this.form.checkInDate}T00:00:00Z`);
    const end = Date.parse(`${this.form.checkOutDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return 0;
    }

    return Math.max(0, Math.round((end - start) / 86_400_000));
  }

  /** Solo informativo: el backend recalcula usando el catálogo. */
  get totalAmount(): number {
    const accommodation = this.selectedAccommodation;
    const nightlyPrice = Number(accommodation?.pricePerNight);
    if (!accommodation || !Number.isFinite(nightlyPrice) || nightlyPrice <= 0 || this.nights < 1) {
      return 0;
    }
    return nightlyPrice * this.nights;
  }

  createReservation(): void {
    this.clearMessages();

    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;

    this.bffApi
      .createReservation(this.form)
      .pipe(
  timeout(15000),
  finalize(() => {
    this.saving = false;
    this.changeDetector.detectChanges();
  }),
)
      .subscribe({
        next: () => {
          this.changeDetector.markForCheck();
          this.message = 'Reserva creada correctamente.';
          this.form = this.emptyForm();
          this.loadReservations();
        },
        error: (error: unknown) => {
          this.changeDetector.markForCheck();
  if (error instanceof TimeoutError) {
    this.errorMessage =
      'El servidor tardó demasiado en responder. Verifica que el BFF y el microservicio de reservas estén ejecutándose.';
    return;
  }

  this.errorMessage = this.getErrorMessage(
    error as HttpErrorResponse,
    'No fue posible crear la reserva.',
  );
},
      });
  }

  confirmReservation(id: number): void {
    this.clearMessages();

    this.bffApi.confirmReservation(id).subscribe({
      next: () => {
        this.changeDetector.markForCheck();
        this.message = 'Reserva confirmada correctamente.';
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.changeDetector.markForCheck();
        this.errorMessage = this.getErrorMessage(
          error,
          'No fue posible confirmar la reserva.',
        );
      },
    });
  }

  cancelReservation(id: number): void {
    const confirmed = window.confirm(
      '¿Confirmas que deseas cancelar esta reserva?',
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.bffApi.cancelReservation(id).subscribe({
      next: () => {
        this.changeDetector.markForCheck();
        this.message = 'Reserva cancelada correctamente.';
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.changeDetector.markForCheck();
        this.errorMessage = this.getErrorMessage(
          error,
          'No fue posible cancelar la reserva.',
        );
      },
    });
  }

  statusLabel(status: ReservationStatus): string {
    const labels: Record<ReservationStatus, string> = {
      CREADA: 'Creada',
      CONFIRMADA: 'Confirmada',
      CHECKIN_PENDIENTE: 'Check-in pendiente',
      EN_ESTADIA: 'En estadía',
      CHECKOUT: 'Checkout realizado',
      CANCELADA: 'Cancelada',
    };

    return labels[status] ?? status;
  }

  /**
   * Siguiente estado del flujo (mismo orden que valida el backend).
   * CREADA se confirma con el botón "Confirmar".
   */
  nextStatus(status: ReservationStatus): ReservationStatus | null {
    const next: Partial<Record<ReservationStatus, ReservationStatus>> = {
      CONFIRMADA: 'CHECKIN_PENDIENTE',
      CHECKIN_PENDIENTE: 'EN_ESTADIA',
      EN_ESTADIA: 'CHECKOUT',
    };

    return next[status] ?? null;
  }

  nextStatusLabel(status: ReservationStatus): string {
    const next = this.nextStatus(status);
    return next ? this.statusLabel(next) : '';
  }

  canCancel(status: ReservationStatus): boolean {
    return (
      status === 'CREADA' ||
      status === 'CONFIRMADA' ||
      status === 'CHECKIN_PENDIENTE'
    );
  }

  advanceReservation(reservation: ReservationResponse): void {
    const next = this.nextStatus(reservation.status);

    if (!next) {
      return;
    }

    this.clearMessages();

    this.bffApi.updateReservationStatus(reservation.id, next).subscribe({
      next: () => {
        this.changeDetector.markForCheck();
        this.message = `Reserva #${reservation.id} actualizada a ${this.statusLabel(next)}.`;
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.changeDetector.markForCheck();
        this.errorMessage = this.getErrorMessage(
          error,
          'No fue posible cambiar el estado de la reserva.',
        );
      },
    });
  }

  private loadUserAndReservations(): void {
    this.loading = true;

    this.bffApi.getCurrentUser().subscribe({
      next: (user) => {
        this.changeDetector.markForCheck();
        this.isAdmin = user.roles.includes('ADMIN');
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.changeDetector.markForCheck();
        this.loading = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'No fue posible obtener el usuario autenticado.',
        );
      },
    });
  }

  private loadReservations(): void {
    this.loading = true;

    const request = this.isAdmin
      ? this.bffApi.getAllReservations()
      : this.bffApi.getMyReservations();

    request
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (reservations) => {
          this.changeDetector.markForCheck();
          this.reservations = reservations;
        },
        error: (error: HttpErrorResponse) => {
          this.changeDetector.markForCheck();
          this.errorMessage = this.getErrorMessage(
            error,
            'No fue posible cargar las reservas.',
          );
        },
      });
  }

  private isFormValid(): boolean {
    const accommodation = this.selectedAccommodation;
    if (!accommodation || !this.form.checkInDate || !this.form.checkOutDate) {
      this.errorMessage = 'Debes seleccionar un alojamiento y completar las fechas.';
      return false;
    }

    if (this.form.checkInDate < this.today || this.nights < 1) {
      this.errorMessage = 'La entrada no puede ser pasada y la salida debe ser posterior a la entrada.';
      return false;
    }

    if (!Number.isInteger(this.form.guests) || this.form.guests < 1 ||
        this.form.guests > accommodation.capacity) {
      this.errorMessage = `Este alojamiento permite entre 1 y ${accommodation.capacity} huéspedes.`;
      return false;
    }

    if (this.totalAmount <= 0) {
      this.errorMessage = 'No se pudo calcular el total con el precio del alojamiento.';
      return false;
    }

    return true;
  }

  private emptyForm(): ReservationRequest {
    return {
      accommodationId: this.accommodations()[0]?.id ?? 0,
      checkInDate: '',
      checkOutDate: '',
      guests: 1,
    };
  }

  private clearMessages(): void {
    this.message = '';
    this.errorMessage = '';
  }

  private getErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    if (typeof error.error === 'string') {
      try {
        const parsed = JSON.parse(error.error);
        return parsed.detail ?? fallback;
      } catch {
        return error.error || fallback;
      }
    }

    return error.error?.detail ?? fallback;
  }
}

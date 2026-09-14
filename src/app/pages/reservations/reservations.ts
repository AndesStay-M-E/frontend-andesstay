import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import {
  BffApiService,
  ReservationRequest,
  ReservationResponse,
  ReservationStatus,
} from '../../services/bff-api.service';

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
  }

  createReservation(): void {
    this.clearMessages();

    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;

    this.bffApi
      .createReservation(this.form)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.message = 'Reserva creada correctamente.';
          this.form = this.emptyForm();
          this.loadReservations();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'No fue posible crear la reserva.',
          );
        },
      });
  }

  confirmReservation(id: number): void {
    this.clearMessages();

    this.bffApi.confirmReservation(id).subscribe({
      next: () => {
        this.message = 'Reserva confirmada correctamente.';
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
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
        this.message = 'Reserva cancelada correctamente.';
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.getErrorMessage(
          error,
          'No fue posible cancelar la reserva.',
        );
      },
    });
  }

  statusLabel(status: ReservationStatus): string {
    const labels: Record<ReservationStatus, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      CANCELLED: 'Cancelada',
      COMPLETED: 'Completada',
    };

    return labels[status];
  }

  private loadUserAndReservations(): void {
    this.loading = true;

    this.bffApi.getCurrentUser().subscribe({
      next: (user) => {
        this.isAdmin = user.roles.includes('ADMIN');
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
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
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (reservations) => {
          this.reservations = reservations;
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'No fue posible cargar las reservas.',
          );
        },
      });
  }

  private isFormValid(): boolean {
    if (
      !this.form.accommodationId ||
      !this.form.checkInDate ||
      !this.form.checkOutDate ||
      !this.form.guests ||
      !this.form.totalAmount
    ) {
      this.errorMessage = 'Debes completar todos los campos.';
      return false;
    }

    if (this.form.checkOutDate <= this.form.checkInDate) {
      this.errorMessage =
        'La fecha de salida debe ser posterior a la fecha de entrada.';
      return false;
    }

    if (this.form.guests < 1 || this.form.totalAmount <= 0) {
      this.errorMessage =
        'Los huéspedes y el monto deben ser mayores que cero.';
      return false;
    }

    return true;
  }

  private emptyForm(): ReservationRequest {
    return {
      accommodationId: 1,
      checkInDate: '',
      checkOutDate: '',
      guests: 1,
      totalAmount: 0,
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

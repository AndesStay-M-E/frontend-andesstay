import { ReservationStatus } from '../services/bff-api.service';
import {
  AccommodationType,
  HousekeepingAction,
} from '../services/catalog-api.service';

/** Textos y estilos compartidos entre pantallas. */

export const RESERVATION_STATUSES: ReservationStatus[] = [
  'CREADA',
  'CONFIRMADA',
  'CHECKIN_PENDIENTE',
  'EN_ESTADIA',
  'CHECKOUT',
  'CANCELADA',
];

const STATUS_LABELS: Record<ReservationStatus, string> = {
  CREADA: 'Creada',
  CONFIRMADA: 'Confirmada',
  CHECKIN_PENDIENTE: 'Check-in pendiente',
  EN_ESTADIA: 'En estadía',
  CHECKOUT: 'Checkout realizado',
  CANCELADA: 'Cancelada',
};

const STATUS_BADGES: Record<ReservationStatus, string> = {
  CREADA: 'badge-warning',
  CONFIRMADA: 'badge-good',
  CHECKIN_PENDIENTE: 'badge-info',
  EN_ESTADIA: 'badge-purple',
  CHECKOUT: 'badge-neutral',
  CANCELADA: 'badge-bad',
};

export function reservationStatusLabel(
  status: ReservationStatus | null | undefined,
): string {
  return status ? (STATUS_LABELS[status] ?? status) : 'Nueva';
}

export function reservationStatusBadge(
  status: ReservationStatus | null | undefined,
): string {
  return status ? (STATUS_BADGES[status] ?? 'badge-neutral') : 'badge-neutral';
}

export const ACCOMMODATION_TYPES: AccommodationType[] = [
  'HABITACION',
  'SUITE',
  'CABANA',
  'DEPARTAMENTO',
];

const TYPE_LABELS: Record<AccommodationType, string> = {
  HABITACION: 'Habitación',
  SUITE: 'Suite',
  CABANA: 'Cabaña',
  DEPARTAMENTO: 'Departamento',
};

export function accommodationTypeLabel(type: AccommodationType): string {
  return TYPE_LABELS[type] ?? type;
}

const ACTION_LABELS: Record<HousekeepingAction, string> = {
  PREPARE_ROOM: 'Preparar',
  CLEAN_ROOM: 'Limpiar',
};

export function housekeepingActionLabel(action: HousekeepingAction): string {
  return ACTION_LABELS[action] ?? action;
}

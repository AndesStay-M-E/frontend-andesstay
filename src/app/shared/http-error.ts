import { HttpErrorResponse } from '@angular/common/http';

/**
 * Convierte un error HTTP en un mensaje amable para el usuario.
 * El backend responde ProblemDetail ({ title, detail, errors }); solo se
 * muestran los mensajes de validación, nunca códigos ni nombres de servicios.
 */
export function httpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'No pudimos conectarnos con el sistema. Revisa tu conexión e intenta nuevamente en unos minutos.';
  }

  if (error.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  // Errores del servidor (500, 502, 503...): mensaje genérico.
  if (error.status >= 500) {
    return `${fallback} Intenta nuevamente en unos minutos.`;
  }

  const body = parseBody(error.error);
  const fieldErrors = body?.errors ? Object.values(body.errors) : [];

  if (fieldErrors.length > 0) {
    return fieldErrors.join(' ');
  }

  // Errores 4xx de negocio (ej: "La reserva ya está confirmada").
  return body?.detail ?? fallback;
}

interface ProblemBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
}

function parseBody(body: unknown): ProblemBody | null {
  if (body && typeof body === 'object') {
    return body as ProblemBody;
  }

  if (typeof body === 'string' && body.trim().startsWith('{')) {
    try {
      return JSON.parse(body) as ProblemBody;
    } catch {
      return null;
    }
  }

  return null;
}

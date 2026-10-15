import { HttpErrorResponse } from '@angular/common/http';

/**
 * Convierte un error HTTP del BFF en un mensaje para el usuario.
 * Los microservicios responden ProblemDetail ({ title, detail, errors }).
 */
export function httpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'No fue posible conectar con el BFF. Verifica que esté en ejecución.';
  }

  if (error.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }

  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  const body = parseBody(error.error);
  const fieldErrors = body?.errors ? Object.values(body.errors) : [];

  if (fieldErrors.length > 0) {
    return fieldErrors.join(' ');
  }

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

import { HttpErrorResponse } from '@angular/common/http';

/**
 * Normaliza los distintos formatos de error que devuelve el backend:
 *
 *  - flask-smorest `abort(400, message={...})` → `{ message: { campo: "texto" | ["texto"] } }`
 *  - flask-smorest `abort(4xx, message="texto")` → `{ message: "texto" }`
 *  - Marshmallow (422)                          → `{ errors: { json: { campo: ["texto"] } } }`
 *  - Endpoints manuales                         → `{ errors: { campo: "texto" } }`
 *  - flask-jwt-extended                         → `{ msg: "texto" }`
 *
 * Devuelve los mensajes aplanados y, cuando aplica, agrupados por campo
 * (clave de primer nivel) para poder resaltarlos en el formulario.
 */
export interface ApiErrorDetail {
  messages: string[];
  fields: Record<string, string[]>;
}

function flatten(value: unknown, out: string[]): void {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (value.trim()) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach(v => flatten(v, out));
  } else if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(v => flatten(v, out));
  } else {
    out.push(String(value));
  }
}

export function extractApiErrors(error: HttpErrorResponse | any): ApiErrorDetail {
  const body = error?.error;
  const fields: Record<string, string[]> = {};
  const messages: string[] = [];

  let source: unknown = null;
  if (typeof body?.msg === 'string') {
    source = body.msg;
  } else if (body?.errors) {
    // Marshmallow anida por ubicación ("json", "query"...): desenvolver.
    source = body.errors.json ?? body.errors.query ?? body.errors;
  } else if (body?.message !== undefined) {
    source = body.message;
  }

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    Object.entries(source as Record<string, unknown>).forEach(([key, val]) => {
      const list: string[] = [];
      flatten(val, list);
      if (list.length) {
        fields[key] = list;
        messages.push(...list);
      }
    });
  } else {
    flatten(source, messages);
  }

  return { messages, fields };
}

/** Primer mensaje legible del backend, o `fallback` si no hay ninguno. */
export function firstApiErrorMessage(error: HttpErrorResponse | any, fallback: string): string {
  return extractApiErrors(error).messages[0] ?? fallback;
}

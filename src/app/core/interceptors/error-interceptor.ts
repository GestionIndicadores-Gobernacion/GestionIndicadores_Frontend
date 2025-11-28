import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      let message = 'Error desconocido';

      // ============================================================
      // 🔥 1. Validaciones Marshmallow (solo mostrar el mensaje)
      // ============================================================
      if (error.error?.errors) {
        const errors = error.error.errors;

        // Si errors es un objeto tipo { field: "mensaje" }
        if (typeof errors === 'object') {
          const firstError = Object.values(errors)[0]; // tomar solo el mensaje
          message = String(firstError);
        }
      }

      // ============================================================
      // 🔥 2. Mensaje general del backend
      // ============================================================
      else if (error.error?.message) {
        message = error.error.message;
      }

      // ============================================================
      // 🔥 3. Errores de conexión
      // ============================================================
      else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      }

      // ============================================================
      // 🔥 4. JWT inválido
      // ============================================================
      else if (error.status === 401) {
        message = 'No autorizado o token inválido.';
      }

      else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      }

      console.error('INTERCEPTOR ERROR:', message);

      toast.error(message);

      return throwError(() => new Error(message));
    })
  );
};

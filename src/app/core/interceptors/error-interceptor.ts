import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // 🚫 NO mostrar toast en endpoints de auth
      if (
        req.url.includes('/auth/me') ||
        req.url.includes('/auth/refresh')
      ) {
        return throwError(() => error);
      }

      let message = 'Error desconocido';

      // 🔎 LOG REAL
      console.error('ERROR COMPLETO:', error);

      if (error.error?.errors) {
        const errors = error.error.errors;
        const firstKey = Object.keys(errors)[0];
        const firstError = errors[firstKey];

        if (Array.isArray(firstError)) {
          message = firstError[0];
        } else if (typeof firstError === 'string') {
          message = firstError;
        }
      }
      else if (typeof error.error?.message === 'string') {
        message = error.error.message;
      }
      else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      }
      else if (error.status === 401) {
        message = 'No autorizado o token inválido.';
      }
      else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      }

      toast.error(message);
      return throwError(() => error);
    })
  );
};

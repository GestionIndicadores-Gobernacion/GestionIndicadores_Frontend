import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      let message = 'Error desconocido';

      // 🔎 LOG REAL para depurar
      console.error('ERROR COMPLETO:', error);

      // ✅ Errores tipo Marshmallow / Flask-Smorest
      if (error.error?.errors) {
        const errors = error.error.errors;

        const firstKey = Object.keys(errors)[0];
        const firstError = errors[firstKey];

        // Puede ser array o string
        if (Array.isArray(firstError)) {
          message = firstError[0];
        } else if (typeof firstError === 'string') {
          message = firstError;
        } else {
          message = JSON.stringify(firstError);
        }
      }

      // ✅ Error con message plano
      else if (typeof error.error?.message === 'string') {
        message = error.error.message;
      }

      // ✅ Sin conexión
      else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      }

      // ✅ Auth
      else if (error.status === 401) {
        message = 'No autorizado o token inválido.';
      }
      else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      }

      console.error('INTERCEPTOR ERROR:', message);
      toast.error(message);

      return throwError(() => error);
    })
  );
};

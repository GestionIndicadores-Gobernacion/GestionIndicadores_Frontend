import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      console.error('ERROR COMPLETO:', error);

      let message = 'Error desconocido';

      // 1️⃣ JWT / flask-jwt-extended
      if (typeof error.error?.msg === 'string') {
        message = error.error.msg;
      }

      // 2️⃣ Errores de validación (Marshmallow)
      else if (error.error?.errors) {
        const errors = error.error.errors;
        const firstKey = Object.keys(errors)[0];
        const firstError = errors[firstKey];

        if (Array.isArray(firstError)) {
          message = firstError[0];
        } else if (typeof firstError === 'string') {
          message = firstError;
        }
      }

      // 3️⃣ Mensaje plano
      else if (typeof error.error?.message === 'string') {
        message = error.error.message;
      }

      // 4️⃣ Red / CORS
      else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      }

      // 5️⃣ Auth
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

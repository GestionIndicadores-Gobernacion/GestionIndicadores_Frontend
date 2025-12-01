import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      let message = 'Error desconocido';

      if (error.error?.errors) {
        const firstError = Object.values(error.error.errors)[0];
        message = String(firstError);
      }
      else if (error.error?.message) {
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

      console.error('INTERCEPTOR ERROR:', message);
      toast.error(message);

      // 👇 DEVOLVER EL ERROR ORIGINAL
      return throwError(() => error);
    })
  );

};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // ✅ Ignorar 401 aquí — authInterceptor ya lo maneja
      if (error.status === 401) {
        return throwError(() => error);
      }

      console.error('ERROR COMPLETO:', error);
      let message = 'Error desconocido';

      if (typeof error.error?.msg === 'string') {
        message = error.error.msg;
      } else if (error.error?.errors) {
        const errors = error.error.errors;
        const firstKey = Object.keys(errors)[0];
        const firstError = errors[firstKey];
        message = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (typeof error.error?.message === 'string') {
        message = error.error.message;
      } else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      } else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      }

      toast.error(message);
      return throwError(() => error);
    })
  );
};
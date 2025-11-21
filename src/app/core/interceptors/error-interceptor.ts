import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Error desconocido';

      if (error.error?.message) {
        message = error.error.message;
      } else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      } else if (error.status === 401) {
        message = 'No autorizado o token inválido.';
      } else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      }

      console.error('HTTP Error:', message);

      return throwError(() => message);
    })
  );
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { extractApiErrors } from '../utils/api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // Cualquier error que el authInterceptor reconozca como rechazo de
      // token (401, 422, o 403 con shape JWT) se deja pasar sin toast aquí:
      // ya se mostró el aviso de "sesión expirada" desde AuthService.
      if (auth.isAuthRejection(error)) {
        return throwError(() => error);
      }

      console.error('ERROR COMPLETO:', error);
      // Antes, si `message` era un objeto (abort(400, message={campo: ...})
      // de flask-smorest) caía en 'Error desconocido' y se perdía el
      // motivo real del rechazo.
      const backendMessage = extractApiErrors(error).messages[0];
      let message = 'Error desconocido';

      if (backendMessage) {
        message = backendMessage;
      } else if (error.status === 0) {
        message = 'No hay conexión con el servidor.';
      } else if (error.status === 403) {
        message = 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 429) {
        message = 'Demasiados intentos. Espera un momento antes de volver a intentar.';
      }

      toast.error(message);
      return throwError(() => error);
    })
  );
};

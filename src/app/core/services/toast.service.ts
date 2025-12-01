import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#fff',
    color: '#333',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  success(message: string) {
    this.Toast.fire({
      icon: 'success',
      title: message,
    });
  }

  error(message: string) {
    this.Toast.fire({
      icon: 'error',
      title: message,
    });
  }

  warning(message: string) {
    this.Toast.fire({
      icon: 'warning',
      title: message,
    });
  }

  info(message: string) {
    this.Toast.fire({
      icon: 'info',
      title: message,
    });
  }

  // ⚠️ **Confirm Dialog** -------------------------
  confirm(
    title: string,
    text: string = '',
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar'
  ) {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true, // Botón de cancelar primero → más seguro
    });
  }
}

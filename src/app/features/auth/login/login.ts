import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {

  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  // ==============================
  // 🔥 Igual que en tus otros forms
  // ==============================
  showError(control: NgModel) {
    return control.invalid && (control.dirty || control.touched);
  }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      this.toast.warning('Por favor completa los campos obligatorios.');
      Object.values(form.controls).forEach(c => c.markAsTouched());
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.auth.login({ email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          this.auth.saveSession(
            res.access_token,
            res.refresh_token,
            res.user
          );

          this.toast.success('Bienvenido nuevamente');
          this.router.navigate(['/dashboard']);
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.msg || 'Credenciales incorrectas';
          this.toast.error(this.errorMessage);
          this.loading = false;
        }
      });
  }
}

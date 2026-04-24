import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {

  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    // Si el usuario llegó a login por una sesión expirada, mostrar aviso
    // una sola vez. consumeSessionExpiredReason() limpia el estado.
    const reason = this.auth.consumeSessionExpiredReason();
    if (reason && !this.errorMessage) {
      this.errorMessage = reason === 'invalid'
        ? 'Tu sesión no es válida. Inicia sesión nuevamente.'
        : 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    }
  }

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
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  enterAsPublic(): void {
    this.loading = true;
    this.auth.login({
      email: 'publico@indicadorespyba.cloud',
      password: 'publico2026'
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.auth.saveSession(res.access_token, res.refresh_token, res.user);
        this.router.navigate(['/dashboard']);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

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
    private router: Router
  ) { }

  onSubmit(form: NgForm) {
    if (form.invalid) return;

    this.loading = true;

    this.auth.login({ email: this.email, password: this.password })
      .subscribe({
        next: (res) => {

          // 👇 ARREGLADO
          this.auth.saveSession(
            res.access_token,
            res.refresh_token,
            res.user
          );

          this.router.navigate(['/dashboard']);
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.msg || 'Error al iniciar sesión';
          this.loading = false;
        }
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { UserCreateRequest, UserUpdateRequest } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-form.html'
})
export class UserFormComponent implements OnInit {

  loading = true;
  saving = false;

  isEdit = false;
  userId: number | null = null;

  attemptedSubmit = false;

  roles: any[] = [];

  form = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role_id: null as number | null,
    profile_image_url: ''
  };

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private usersService: UsersService,
    private rolesService: RolesService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.userId;

    this.loadRoles();

    if (this.isEdit) {
      this.loadUser();
    } else {
      this.loading = false;
    }
  }

  isMainAdmin(): boolean {
    return this.isEdit && this.form.email === 'admin@gobernacion.gov.co';
  }

  // =========================================
  // VALIDACIONES
  // =========================================

  isValidEmail(email: string): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  passwordInvalid(): boolean {
    // En creación → obligatorio
    if (!this.isEdit && !this.form.password) return true;

    // En edición → si escribe algo, validar longitud mínima
    if (this.isEdit && this.form.password && this.form.password.length < 6) return true;

    return false;
  }

  // =========================================
  // CARGAR DATOS
  // =========================================

  loadRoles() {
    this.rolesService.getAll().subscribe({
      next: (res) => this.roles = res,
      error: () => this.toast.error('Error cargando roles')
    });
  }

  loadUser() {
    this.usersService.getById(this.userId!).subscribe({
      next: (user) => {
        this.form = {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          password: '',
          role_id: user.role?.id || null,
          profile_image_url: user.profile_image_url || ''
        };
        this.loading = false;
      },
      error: () => {
        this.toast.error('Usuario no encontrado');
        this.router.navigate(['/users']);
      }
    });
  }

  // =========================================
  // GUARDAR
  // =========================================

  save() {
    this.attemptedSubmit = true;

    // Validación completa
    if (
      !this.form.first_name.trim() ||
      !this.form.last_name.trim() ||
      !this.form.email.trim() ||
      !this.isValidEmail(this.form.email) ||
      this.passwordInvalid() ||
      !this.form.role_id
    ) {
      this.toast.warning('Por favor corrige los errores del formulario.');
      return;
    }

    this.saving = true;

    if (this.isEdit) {
      const payload: UserUpdateRequest = {
        first_name: this.form.first_name.trim(),
        last_name: this.form.last_name.trim(),
        email: this.form.email.trim(),
        role_id: this.form.role_id!
      };

      // Solo incluir password si se modificó
      if (this.form.password.trim() !== '') {
        payload.password = this.form.password;
      }

      // Solo incluir profile_image_url si existe
      if (this.form.profile_image_url.trim() !== '') {
        payload.profile_image_url = this.form.profile_image_url.trim();
      }

      this.usersService.update(this.userId!, payload).subscribe({
        next: () => {
          this.toast.success('Usuario actualizado correctamente');
          this.router.navigate(['/users']);
        },
        error: () => {
          this.saving = false;
        }
      });

    } else {
      const payload: UserCreateRequest = {
        first_name: this.form.first_name.trim(),
        last_name: this.form.last_name.trim(),
        email: this.form.email.trim(),
        password: this.form.password,
        role_id: this.form.role_id!
      };

      // Solo incluir profile_image_url si existe
      if (this.form.profile_image_url.trim() !== '') {
        payload.profile_image_url = this.form.profile_image_url.trim();
      }

      this.usersService.create(payload).subscribe({
        next: () => {
          this.toast.success('Usuario creado correctamente');
          this.router.navigate(['/users']);
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/users']);
  }
}
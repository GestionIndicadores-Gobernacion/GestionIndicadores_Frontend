import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserModel, UserUpdateRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html'
})
export class MyProfileComponent implements OnInit {

  loading = true;
  saving = false;
  savingPassword = false;

  isEditing = false;
  showChangePassword = false;

  attemptedSubmit = false;
  attemptedPasswordChange = false;

  user!: UserModel;

  editForm = {
    first_name: '',
    last_name: '',
    email: '',
    profile_image_url: ''
  };

  passwordForm = {
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private usersService: UsersService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.loadProfile();
  }

  // =========================================
  // CARGAR PERFIL
  // =========================================

  loadProfile() {
    this.loading = true;
    this.usersService.getMe().subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Error cargando perfil');
        this.loading = false;
      }
    });
  }

  // =========================================
  // EDITAR PERFIL
  // =========================================

  toggleEdit() {
    this.isEditing = true;
    this.attemptedSubmit = false;

    // Copiar datos actuales al form de edición
    this.editForm = {
      first_name: this.user.first_name,
      last_name: this.user.last_name,
      email: this.user.email,
      profile_image_url: this.user.profile_image_url || ''
    };
  }

  cancelEdit() {
    this.isEditing = false;
    this.attemptedSubmit = false;
  }

  saveProfile() {
    this.attemptedSubmit = true;

    // Validaciones
    if (
      !this.editForm.first_name.trim() ||
      !this.editForm.last_name.trim() ||
      !this.editForm.email.trim() ||
      !this.isValidEmail(this.editForm.email)
    ) {
      this.toast.warning('Por favor corrige los errores del formulario.');
      return;
    }

    this.saving = true;

    const payload: UserUpdateRequest = {
      first_name: this.editForm.first_name.trim(),
      last_name: this.editForm.last_name.trim(),
      email: this.editForm.email.trim()
    };

    if (this.editForm.profile_image_url.trim()) {
      payload.profile_image_url = this.editForm.profile_image_url.trim();
    }

    this.usersService.update(this.user.id, payload).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.isEditing = false;
        this.saving = false;
        this.toast.success('Perfil actualizado correctamente');
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  // =========================================
  // CAMBIAR CONTRASEÑA
  // =========================================

  changePassword() {
    this.attemptedPasswordChange = true;

    // Validaciones
    if (
      !this.passwordForm.newPassword ||
      this.passwordForm.newPassword.length < 6 ||
      this.passwordForm.newPassword !== this.passwordForm.confirmPassword
    ) {
      this.toast.warning('Por favor corrige los errores del formulario.');
      return;
    }

    this.savingPassword = true;

    const payload: UserUpdateRequest = {
      password: this.passwordForm.newPassword
    };

    this.usersService.update(this.user.id, payload).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada correctamente');
        this.cancelPasswordChange();
        this.savingPassword = false;
      },
      error: () => {
        this.savingPassword = false;
      }
    });
  }

  cancelPasswordChange() {
    this.showChangePassword = false;
    this.attemptedPasswordChange = false;
    this.passwordForm = {
      newPassword: '',
      confirmPassword: ''
    };
  }

  // =========================================
  // UTILIDADES
  // =========================================

  isValidEmail(email: string): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
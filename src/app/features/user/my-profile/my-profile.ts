import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserModel, UserUpdateRequest } from '../../../core/models/user.model';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush   // ← único cambio de decorator
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
    private toast: ToastService,
    private cdr: ChangeDetectorRef    // ← inyectar CDR
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
        this.cdr.markForCheck();      // ← vista no sabe del dato hasta acá
      },
      error: () => {
        this.toast.error('Error cargando perfil');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // =========================================
  // EDITAR PERFIL
  // =========================================

  toggleEdit() {
    this.isEditing = true;
    this.attemptedSubmit = false;
    this.editForm = {
      first_name: this.user.first_name,
      last_name: this.user.last_name,
      email: this.user.email,
      profile_image_url: this.user.profile_image_url || ''
    };
    // no necesita markForCheck — lo dispara el evento click del template
  }

  cancelEdit() {
    this.isEditing = false;
    this.attemptedSubmit = false;
    // ídem — evento del template dispara la detección
  }

  saveProfile() {
    this.attemptedSubmit = true;

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
        this.cdr.markForCheck();      // ← user y saving cambiaron desde async
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      }
    });
  }

  // =========================================
  // CAMBIAR CONTRASEÑA
  // =========================================

  changePassword() {
    this.attemptedPasswordChange = true;

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
        this.cdr.markForCheck();      // ← savingPassword y estado del form cambiaron
      },
      error: () => {
        this.savingPassword = false;
        this.cdr.markForCheck();
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
    // no necesita markForCheck — lo dispara el evento click
  }

  // =========================================
  // UTILIDADES
  // =========================================

  isValidEmail(email: string): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
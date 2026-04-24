import { Component, DestroyRef, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../../features/user/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserModel, UserUpdateRequest } from '../../../features/user/models/user.model';
import { PageState, PageStateComponent } from '../../../shared/components/page-state/page-state';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, PageStateComponent],
  templateUrl: './my-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush   // ← único cambio de decorator
})
export class MyProfileComponent implements OnInit {

  loading = true;
  loadError = false;
  saving = false;
  savingPassword = false;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    return 'content';
  }

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

  private destroyRef = inject(DestroyRef);

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
    this.loadError = false;
    this.usersService.getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
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

    this.usersService.update(this.user.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

    this.usersService.update(this.user.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { ComponentsService } from '../../../core/services/components.service';
import { UserCreateRequest, UserUpdateRequest } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent implements OnInit {

  loading = true;
  saving = false;
  isEdit = false;
  userId: number | null = null;
  attemptedSubmit = false;

  roles: any[] = [];
  allComponents: any[] = [];       // todos los componentes disponibles
  selectedComponentIds: number[] = []; // IDs seleccionados

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
    private componentsService: ComponentsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.userId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.userId;

    this.loadRoles();
    this.loadComponents();

    if (this.isEdit) {
      this.loadUser();
    } else {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  isMainAdmin(): boolean {
    return this.isEdit && this.form.email === 'admin@gobernacion.gov.co';
  }

  /** El admin tiene acceso a todo, no necesita asignaciones */
  get selectedRoleIsAdmin(): boolean {
    const role = this.roles.find(r => r.id === this.form.role_id);
    return role?.name === 'admin' || role?.name === 'monitor';
  }
  
  isComponentSelected(id: number): boolean {
    return this.selectedComponentIds.includes(id);
  }

  toggleComponent(id: number) {
    const idx = this.selectedComponentIds.indexOf(id);
    if (idx === -1) {
      this.selectedComponentIds = [...this.selectedComponentIds, id];
    } else {
      this.selectedComponentIds = this.selectedComponentIds.filter(c => c !== id);
    }
    this.cdr.markForCheck();
  }

  // ── Validaciones ─────────────────────────────────────────────────────

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  passwordInvalid(): boolean {
    if (!this.isEdit && !this.form.password) return true;
    if (this.isEdit && this.form.password && this.form.password.length < 6) return true;
    return false;
  }

  // ── Carga de datos ───────────────────────────────────────────────────

  loadRoles() {
    this.rolesService.getAll().subscribe({
      next: (res) => { this.roles = res; this.cdr.markForCheck(); },
      error: () => this.toast.error('Error cargando roles')
    });
  }

  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: (res) => { this.allComponents = res; this.cdr.markForCheck(); },
      error: () => this.toast.error('Error cargando componentes')
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
        // Precargar componentes asignados
        this.selectedComponentIds = (user.component_assignments || []).map(a => a.component_id);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Usuario no encontrado');
        this.router.navigate(['/users']);
      }
    });
  }

  // ── Guardar ──────────────────────────────────────────────────────────

  save() {
    this.attemptedSubmit = true;
    this.cdr.markForCheck();

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
    this.cdr.markForCheck();

    // Solo enviar component_ids si el rol NO es admin
    const componentIds = this.selectedRoleIsAdmin ? undefined : this.selectedComponentIds;

    if (this.isEdit) {
      const payload: UserUpdateRequest = {
        first_name: this.form.first_name.trim(),
        last_name: this.form.last_name.trim(),
        email: this.form.email.trim(),
        role_id: this.form.role_id!,
        component_ids: componentIds
      };
      if (this.form.password.trim()) payload.password = this.form.password;
      if (this.form.profile_image_url.trim()) payload.profile_image_url = this.form.profile_image_url.trim();

      this.usersService.update(this.userId!, payload).subscribe({
        next: () => { this.toast.success('Usuario actualizado correctamente'); this.router.navigate(['/users']); },
        error: () => { this.saving = false; this.cdr.markForCheck(); }
      });

    } else {
      const payload: UserCreateRequest = {
        first_name: this.form.first_name.trim(),
        last_name: this.form.last_name.trim(),
        email: this.form.email.trim(),
        password: this.form.password,
        role_id: this.form.role_id!,
        component_ids: componentIds
      };
      if (this.form.profile_image_url.trim()) payload.profile_image_url = this.form.profile_image_url.trim();

      this.usersService.create(payload).subscribe({
        next: () => { this.toast.success('Usuario creado correctamente'); this.router.navigate(['/users']); },
        error: () => { this.saving = false; this.cdr.markForCheck(); }
      });
    }
  }

  cancel() {
    this.router.navigate(['/users']);
  }
}
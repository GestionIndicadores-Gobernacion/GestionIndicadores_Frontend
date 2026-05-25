import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';

import { AdminRbacService } from '../services/admin-rbac.service';
import { RoleDetail, TOTAL_PERMISSIONS } from '../models/admin.model';
import {
  PageState,
  PageStateComponent,
} from '../../../shared/components/page-state/page-state';
import { ShadowModeBannerComponent } from '../components/shadow-mode-banner/shadow-mode-banner';

/**
 * `/admin/roles` — listado de roles y resumen de permisos.
 *
 * D1 es read-only. Solo 4 roles → sin paginación ni búsqueda.
 *
 * El banner de shadow mode se muestra siempre (controlado por la
 * feature flag `SHADOW_MODE_ENABLED`).
 */
@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    PageStateComponent,
    ShadowModeBannerComponent,
  ],
  templateUrl: './roles-list.html',
  styleUrls: ['./roles-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListComponent implements OnInit {

  /** Total de permisos del catálogo — expuesto al template como denominador. */
  readonly TOTAL_PERMISSIONS = TOTAL_PERMISSIONS;

  roles: RoleDetail[] = [];
  loading = true;
  loadError = false;

  private readonly admin = inject(AdminRbacService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    if (this.roles.length === 0) return 'empty';
    return 'content';
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.loadError = false;
    this.cdr.markForCheck();

    this.admin.getRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: roles => {
          this.roles = roles ?? [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Devuelve el contador formateado "asignados / total" o "-" si el
   * backend aún no emite `permission_count`.
   */
  formatPermissionCount(role: RoleDetail): string {
    if (role.permission_count == null) return '-';
    return `${role.permission_count} / ${this.TOTAL_PERMISSIONS}`;
  }

  formatUserCount(role: RoleDetail): string {
    if (role.user_count == null) return '-';
    return `${role.user_count}`;
  }

  /** Etiqueta limpia para el campo descripción. */
  describe(role: RoleDetail): string {
    return (role.description ?? '').trim() || '—';
  }
}

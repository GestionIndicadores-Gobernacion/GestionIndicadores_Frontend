import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { AdminRbacService } from '../services/admin-rbac.service';
import {
  MODULE_ORDER,
  Permission,
  RoleDetail,
  RolePermissionsDiff,
  TOTAL_PERMISSIONS,
  isCriticalPermission,
} from '../models/admin.model';
import {
  PageState,
  PageStateComponent,
} from '../../../shared/components/page-state/page-state';
import { ShadowModeBannerComponent } from '../components/shadow-mode-banner/shadow-mode-banner';
import { RolePermissionsDiffModalComponent } from '../components/role-permissions-diff-modal/role-permissions-diff-modal';
import { CanDirective } from '../../../shared/directives/can';
import { PermissionService } from '../../../core/services/permission.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PERMS, ROLE_IDS } from '../../../core/constants/permissions';
import { SHADOW_MODE_ENABLED } from '../../../core/constants/feature-flags';

interface ModuleSection {
  readonly key: string;
  readonly label: string;
  readonly permissions: ReadonlyArray<Permission>;
}

/**
 * `/admin/roles/:id` — detalle de un rol con sus permisos agrupados por módulo.
 *
 * D2 introduce el modo edición. La matriz mantiene su forma read-only por
 * defecto; entrar a edit mode habilita los checkboxes, computa un diff vivo
 * contra el snapshot original y abre un modal de confirmación al guardar.
 *
 * Reglas críticas que la UI respeta:
 *  - Permisos críticos del rol admin no se pueden quitar (checkbox disabled
 *    con tooltip explicativo).
 *  - El usuario puede editar su propio rol; un banner azul informa el
 *    auto-edit y tras guardar refrescamos `PermissionService` para que
 *    `*appCan` reaccione sin requerir re-login.
 *  - El backend devuelve el shape canónico tras el PUT, así que rehidratamos
 *    `originalCodes` con la respuesta sin volver a leer.
 */
@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    PageStateComponent,
    ShadowModeBannerComponent,
    RolePermissionsDiffModalComponent,
    CanDirective,
  ],
  templateUrl: './role-detail.html',
  styleUrls: ['./role-detail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDetailComponent implements OnInit {

  readonly TOTAL_PERMISSIONS = TOTAL_PERMISSIONS;
  readonly PERMS = PERMS;
  readonly ROLE_IDS = ROLE_IDS;
  readonly SHADOW_MODE_ENABLED = SHADOW_MODE_ENABLED;

  role: RoleDetail | null = null;
  /** Catálogo completo (todos los permisos posibles). */
  catalog: Permission[] = [];
  /** Catálogo agrupado en secciones, en el orden de `MODULE_ORDER`. */
  sections: ModuleSection[] = [];

  loading = true;
  loadError = false;

  // ─── Estado de edición (signals) ────────────────────────────────────

  /** Set canónico tras carga inicial o tras save exitoso. */
  readonly originalCodes = signal<ReadonlySet<string>>(new Set());

  /** Set actual durante la edición. En read-only es igual a `originalCodes`. */
  readonly selectedCodes = signal<Set<string>>(new Set());

  readonly isEditMode = signal(false);
  readonly saving = signal(false);

  /** True si el usuario tiene cambios sin guardar. */
  readonly dirty = computed(() =>
    !this.setsEqual(this.originalCodes(), this.selectedCodes()),
  );

  /** Diff vivo (added / removed) computado contra el snapshot original. */
  readonly diff = computed<RolePermissionsDiff>(() => {
    const orig = this.originalCodes();
    const sel = this.selectedCodes();
    const added: string[] = [];
    for (const c of sel) {
      if (!orig.has(c)) added.push(c);
    }
    const removed: string[] = [];
    for (const c of orig) {
      if (!sel.has(c)) removed.push(c);
    }
    added.sort();
    removed.sort();
    return { added, removed };
  });

  /** Role del usuario actual a partir del JWT — null si no hay sesión. */
  readonly currentUserRoleId = computed<number | null>(() => {
    const payload = this.auth.getTokenPayload();
    return payload?.role_id ?? null;
  });

  /** True si el role mostrado es el rol del usuario activo. */
  readonly isSelfRole = computed(() => {
    const r = this.role;
    if (!r) return false;
    return r.id === this.currentUserRoleId();
  });

  // ─── Modal state ──────────────────────────────────────────────────
  /**
   * `roleForModal` se setea solo cuando el usuario abre el modal — el
   * componente del modal usa esto como switch de visibilidad (input).
   */
  readonly roleForModal = signal<RoleDetail | null>(null);

  // ─── Servicios ────────────────────────────────────────────────────
  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminRbacService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);
  private readonly toast = inject(ToastService);

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    return 'content';
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const roleId = idParam != null ? Number(idParam) : NaN;

    if (!Number.isFinite(roleId)) {
      this.loadError = true;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.load(roleId);
  }

  load(roleId: number): void {
    this.loading = true;
    this.loadError = false;
    this.cdr.markForCheck();

    forkJoin({
      detail: this.admin.getRolePermissions(roleId),
      catalog: this.admin.getPermissionsCatalog(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ detail, catalog }) => {
          this.role = detail?.role ?? null;
          const codes = new Set<string>(
            (detail?.permissions ?? []).map(p => p.code),
          );
          this.originalCodes.set(codes);
          this.selectedCodes.set(new Set(codes));
          this.catalog = catalog ?? [];
          this.sections = this.buildSections(this.catalog);
          this.loading = false;
          // Cancelar edición si veníamos editando un role distinto
          this.isEditMode.set(false);
          this.saving.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Helpers de lectura ────────────────────────────────────────────

  /**
   * True si el code está en el set asignado al rol. Cuando estamos en
   * read-only se basa en `originalCodes`; en edit-mode pasa al estado
   * vivo `selectedCodes` para que la UI refleje los cambios pendientes.
   */
  isAssigned(code: string): boolean {
    return this.isEditMode()
      ? this.selectedCodes().has(code)
      : this.originalCodes().has(code);
  }

  isOriginallyAssigned(code: string): boolean {
    return this.originalCodes().has(code);
  }

  isCurrentlySelected(code: string): boolean {
    return this.selectedCodes().has(code);
  }

  /** Permiso marcado para AGREGAR (no estaba, ahora sí). */
  isMarkedToAdd(code: string): boolean {
    if (!this.isEditMode()) return false;
    return this.selectedCodes().has(code) && !this.originalCodes().has(code);
  }

  /** Permiso marcado para REMOVER (estaba, ahora no). */
  isMarkedToRemove(code: string): boolean {
    if (!this.isEditMode()) return false;
    return this.originalCodes().has(code) && !this.selectedCodes().has(code);
  }

  /**
   * True si este checkbox debe quedar deshabilitado en edit mode por ser
   * crítico del rol admin. La regla aplica solo cuando el role en pantalla
   * es admin Y el permiso está flagueado como crítico.
   */
  isLockedCritical(p: Permission): boolean {
    if (this.role?.name !== 'admin') return false;
    return isCriticalPermission(p);
  }

  /** Estado de disabled del checkbox en el template. */
  isCheckboxDisabled(p: Permission): boolean {
    if (!this.isEditMode()) return true;
    if (this.saving()) return true;
    return this.isLockedCritical(p);
  }

  /** Tooltip para checkboxes deshabilitados durante la edición. */
  tooltipForChecked(p: Permission): string | null {
    if (this.isLockedCritical(p)) {
      return 'Permiso crítico — no se puede revocar del rol admin';
    }
    return null;
  }

  // ─── Modo edición ───────────────────────────────────────────────────

  enterEditMode(): void {
    if (this.isEditMode()) return;
    // Snapshot inicial = original
    this.selectedCodes.set(new Set(this.originalCodes()));
    this.isEditMode.set(true);
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    if (!this.isEditMode()) return;
    if (this.dirty()) {
      // Pedimos confirmación nativa. SweetAlert sería async; el flujo de
      // descarte se mantiene síncrono y barato.
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm('¿Descartar los cambios sin guardar?');
      if (!ok) return;
    }
    this.selectedCodes.set(new Set(this.originalCodes()));
    this.isEditMode.set(false);
    this.cdr.markForCheck();
  }

  /**
   * Toggle un permiso en el set de edición. Si el componente está en
   * read-only o el permiso es crítico del rol admin, se ignora silenciosamente
   * — el caller (template) ya marca el checkbox como `disabled` en esos
   * casos, pero defendemos el método para garantizar invariantes.
   */
  togglePerm(code: string, ev?: Event): void {
    if (!this.isEditMode()) return;
    if (this.saving()) return;

    const perm = this.catalog.find(p => p.code === code);
    if (perm && this.isLockedCritical(perm)) {
      // Si el evento llegó (click sobre la label) cancelamos el default
      // para no marcar visualmente nada.
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }

    const next = new Set(this.selectedCodes());
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    this.selectedCodes.set(next);
    this.cdr.markForCheck();
  }

  // ─── Diff modal ────────────────────────────────────────────────────

  openDiffModal(): void {
    if (!this.dirty()) return;
    if (!this.role) return;
    this.roleForModal.set(this.role);
    this.cdr.markForCheck();
  }

  closeDiffModal(): void {
    if (this.saving()) return;
    this.roleForModal.set(null);
    this.cdr.markForCheck();
  }

  /**
   * Confirmación del modal — dispara el PUT, maneja success/error.
   * Manejo de errores:
   *  - 403: backend rechazó por críticos. Toast en rojo con el msg.
   *  - 404: code inexistente. Toast genérico.
   *  - cualquier otro: toast genérico.
   *
   * Tras éxito hidratamos `originalCodes` con el shape del PUT response.
   * Si el role editado coincide con el del usuario actual, refrescamos el
   * `PermissionService` para que `*appCan` reaccione sin re-login.
   */
  applyDiff(): void {
    if (!this.role) return;
    if (this.saving()) return;

    const roleId = this.role.id;
    const targetCodes = [...this.selectedCodes()];

    this.saving.set(true);
    this.cdr.markForCheck();

    this.admin.updateRolePermissions(roleId, targetCodes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          // Reemplazamos `role` con el shape devuelto (counts actualizados)
          this.role = res?.role ?? this.role;
          const codes = new Set<string>(
            (res?.permissions ?? []).map(p => p.code),
          );
          this.originalCodes.set(codes);
          this.selectedCodes.set(new Set(codes));
          this.isEditMode.set(false);
          this.saving.set(false);
          this.roleForModal.set(null);

          this.toast.success('Permisos actualizados');

          // Self-edit: refresca el set del usuario activo sin re-login.
          // Si el refresh falla (red caída, 401), avisamos al usuario para
          // que cierre sesión — el toast de éxito ya se mostró y el set
          // local podría quedar rancio.
          if (this.role && this.role.id === this.currentUserRoleId()) {
            this.perms.refresh().subscribe({
              error: () => {
                this.toast.warning(
                  'No se pudieron sincronizar tus permisos. Cerrá sesión y volvé a entrar.',
                );
              },
            });
          }

          this.cdr.markForCheck();
        },
        error: err => {
          this.saving.set(false);
          this.cdr.markForCheck();
          this.toast.error(this.describeError(err));
        },
      });
  }

  private describeError(err: unknown): string {
    const e = err as { status?: number; error?: { msg?: string; detail?: string } };
    const status = e?.status;
    const backendMsg = e?.error?.msg ?? e?.error?.detail;

    if (status === 403) {
      return backendMsg || 'No se pueden quitar permisos críticos del rol admin';
    }
    if (status === 404) {
      return backendMsg || 'Uno o más permisos no existen en el catálogo';
    }
    return backendMsg || 'No se pudieron guardar los cambios';
  }

  // ─── Helpers internos ───────────────────────────────────────────────

  private setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false;
    for (const c of a) {
      if (!b.has(c)) return false;
    }
    return true;
  }

  /**
   * Construye las secciones por módulo siguiendo el orden de `MODULE_ORDER`.
   *
   * Casos especiales:
   *  - `users.read_permissions` se queda en módulo `users` (no en `roles`),
   *    incluso si el backend la devolviera con `module='roles'`.
   *  - Permisos cuyo módulo no esté en `MODULE_ORDER` se agrupan al final
   *    bajo "Otros" — no se descartan silenciosamente.
   */
  private buildSections(catalog: ReadonlyArray<Permission>): ModuleSection[] {
    const byModule = new Map<string, Permission[]>();

    for (const p of catalog) {
      const mod = this.resolveModule(p);
      const bucket = byModule.get(mod);
      if (bucket) {
        bucket.push(p);
      } else {
        byModule.set(mod, [p]);
      }
    }

    const ordered: ModuleSection[] = [];
    const seen = new Set<string>();

    for (const cfg of MODULE_ORDER) {
      const perms = byModule.get(cfg.key);
      seen.add(cfg.key);
      if (perms && perms.length > 0) {
        ordered.push({ key: cfg.key, label: cfg.label, permissions: perms });
      }
    }

    // Cualquier módulo no listado en MODULE_ORDER va al final.
    const leftover: Permission[] = [];
    for (const [key, perms] of byModule) {
      if (!seen.has(key)) leftover.push(...perms);
    }
    if (leftover.length > 0) {
      ordered.push({ key: 'otros', label: 'Otros', permissions: leftover });
    }

    return ordered;
  }

  private resolveModule(p: Permission): string {
    // `users.read_permissions` se queda en users por consistencia con el
    // requisito de UX (el permiso es sobre lectura de permisos efectivos
    // de un user, no sobre el catálogo roles).
    if (p.code === 'users.read_permissions') return 'users';
    return p.module || 'otros';
  }

  /** Conteo total de permisos asignados (refleja edit mode si está activo). */
  get assignedCount(): number {
    return this.isEditMode()
      ? this.selectedCodes().size
      : this.originalCodes().size;
  }

  /** Total del catálogo cargado (fallback a `TOTAL_PERMISSIONS`). */
  get catalogCount(): number {
    return this.catalog.length > 0 ? this.catalog.length : this.TOTAL_PERMISSIONS;
  }

  describe(role: RoleDetail | null): string {
    return ((role?.description ?? '').trim()) || '—';
  }

  formatUserCount(): string {
    if (this.role?.user_count == null) return '-';
    return `${this.role.user_count}`;
  }
}

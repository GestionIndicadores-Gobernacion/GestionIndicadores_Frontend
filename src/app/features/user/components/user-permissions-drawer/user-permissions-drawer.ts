// Drawer de permisos efectivos para un usuario concreto.
//
// D1 (read-only) y D3 (overrides editables) conviven en el mismo shell:
//   - Por defecto el drawer arranca en modo lectura, mostrando el set
//     efectivo, los grants/revokes manuales y los heredados del rol.
//   - El botón "Editar overrides" entra a un modo donde cada permiso del
//     catálogo se renderiza como una pill tri-state interactiva. El
//     usuario puede otorgar (grant), revocar (revoke) o volver a la
//     herencia del rol (`null`).
//   - Al guardar, calculamos un diff (`added/removed/changed`) y abrimos
//     un modal de confirmación con banners contextuales (self-edit,
//     main_admin, shadow_mode, escalación a no-admin, lockout sin perms).
//
// Reglas críticas que la UI respeta:
//   - Permisos críticos NUNCA se revocan si target es self, main_admin
//     o admin. El backend re-valida; el frontend bloquea para evitar
//     viajes inútiles y muestra warning.
//   - Otorgar permiso crítico a no-admin se permite pero se marca como
//     "escalación de privilegios" — banner rojo en el modal.
//
// Lazy fetch: el drawer monta el template antes de tener userId, pero NO
// llama al backend hasta que el input pasa a un valor truthy.

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import {
  UserPermissionsService,
  UserPermissionsView,
  UserPermissionOverride,
  OverrideEffect,
  OverrideEntry,
} from '../../services/user-permissions.service';
import { ALL_PERMISSION_CODES, PERMS, ROLE_IDS } from '../../../../core/constants/permissions';
import { CanDirective } from '../../../../shared/directives/can';
import { PermissionService } from '../../../../core/services/permission.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SHADOW_MODE_ENABLED } from '../../../../core/constants/feature-flags';
import { AdminRbacService } from '../../../admin/services/admin-rbac.service';
import {
  Permission,
  MODULE_ORDER,
  isCriticalPermission,
} from '../../../admin/models/admin.model';
import { UserOverridesDiffModalComponent } from '../user-overrides-diff-modal/user-overrides-diff-modal';

type DrawerState = 'idle' | 'loading' | 'error' | 'content';

interface PermItem {
  code: string;
  description: string;
}

interface GroupedEntry {
  module: string;
  moduleLabel: string;
  items: PermItem[];
}

interface OverrideChip {
  code: string;
  effect: OverrideEffect;
  byEmail: string | null;
  atIso: string;
  atLabel: string;
  tooltip: string;
}

/**
 * Estado calculado por permiso en el drawer en modo edit:
 *  - `inherited`: el rol tiene la perm y NO hay override. Default.
 *  - `not_assigned`: el rol no tiene la perm y NO hay override. Default.
 *  - `grant`: override grant explícito.
 *  - `revoke`: override revoke explícito.
 */
export type OverrideState = 'inherited' | 'grant' | 'revoke' | 'not_assigned';

export interface OverridesDiff {
  /** Estado pasó de inherited/not_assigned a grant/revoke. */
  added: OverrideEntry[];
  /** Estado pasó de grant/revoke a inherited/not_assigned. */
  removed: OverrideEntry[];
  /** Cambió de grant↔revoke. */
  changed: { permission_code: string; from: OverrideEffect; to: OverrideEffect }[];
}

interface PermRow {
  perm: Permission;
  /** Estado actual (en edit: post-cambios; en read-only: refleja overrides actuales). */
  state: OverrideState;
  /** True si el override es elevación de privilegio (grant crítico a no-admin). */
  isElevation: boolean;
  /** True si la pill revoke está bloqueada (crítico + admin/main_admin/self). */
  isRevokeLocked: boolean;
  /** True si el row tiene un override activo (grant o revoke). */
  hasOverride: boolean;
}

interface ModuleSection {
  key: string;
  label: string;
  rows: PermRow[];
}

/**
 * Etiqueta humana por módulo. Los keys deben coincidir con la primera
 * mitad del code (`users.read` → `users`). Si llega un módulo no listado
 * caemos al code crudo para no romper la UI.
 */
const MODULE_LABELS: Readonly<Record<string, string>> = {
  users: 'Usuarios',
  roles: 'Roles',
  audit: 'Auditoría',
  strategies: 'Estrategias',
  components: 'Componentes',
  strategy_metrics: 'Métricas de estrategia',
  public_policies: 'Políticas públicas',
  datasets: 'Datasets',
  reports: 'Reportes',
  action_plans: 'Planes de acción',
};

/**
 * Set local de codes considerados críticos cuando el catálogo del backend
 * todavía no marca `is_critical`. Misma fuente que `admin.model.ts` —
 * compartirla evita drift. Lo exportamos por requisito del stream.
 */
export const CRITICAL_PERMS_FALLBACK: ReadonlySet<string> = new Set([
  'roles.read',
  'roles.manage',
  'users.manage',
  'users.manage_permissions',
  'users.read_permissions',
]);

@Component({
  selector: 'app-user-permissions-drawer',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    CanDirective,
    UserOverridesDiffModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-permissions-drawer.html',
})
export class UserPermissionsDrawerComponent implements OnDestroy {

  /** Exposición de constantes para el template (`*appCan` necesita PermCode). */
  readonly PERMS = PERMS;
  readonly ROLE_IDS = ROLE_IDS;
  readonly SHADOW_MODE_ENABLED = SHADOW_MODE_ENABLED;

  /**
   * Cuando cambia a un valor truthy, dispara fetch. Cambios a `null`
   * cierran el panel y limpian el estado para que el próximo open arranque
   * fresco (sin parpadear con datos viejos).
   */
  @Input()
  set userId(value: number | null) {
    const next = value ?? null;
    if (next === this._userId()) return;
    this._userId.set(next);
    if (next != null) {
      this.load(next);
    } else {
      this.resetState();
    }
  }
  get userId(): number | null {
    return this._userId();
  }

  /** Texto auxiliar para el header — no participa del fetch. */
  @Input() userDisplayName: string = '';

  @Output() closed = new EventEmitter<void>();

  // Estado interno ----------------------------------------------------------
  private readonly _userId = signal<number | null>(null);
  readonly state = signal<DrawerState>('idle');
  readonly view = signal<UserPermissionsView | null>(null);
  readonly overrides = signal<UserPermissionOverride[]>([]);
  readonly catalog = signal<Permission[]>([]);

  /** True mientras el panel está visible — controla animación y body lock. */
  readonly isOpen = computed(() => this._userId() != null);

  // ─── Edit mode (D3) ──────────────────────────────────────────────────
  readonly isEditMode = signal(false);
  readonly saving = signal(false);

  /**
   * Snapshot canónico tras carga inicial o tras save exitoso.
   * Mapa de code → effect actual del override (sin entry = sin override).
   */
  readonly originalOverrides = signal<ReadonlyMap<string, OverrideEffect>>(new Map());

  /**
   * Estado vivo durante edición. `null` = override removido (volverá al
   * default). Entry inexistente = sin cambios respecto al original.
   * Trabajamos sobre una copia mutable del original al entrar a edit mode.
   */
  readonly selectedOverrides = signal<ReadonlyMap<string, OverrideEffect | null>>(new Map());

  /** Switch del modal diff. */
  readonly confirmingDiff = signal(false);

  // Derivados ----------------------------------------------------------------
  readonly effectiveGrouped = computed(() => {
    const v = this.view();
    return v ? this.groupByModule(v.effective) : [];
  });

  readonly fromRoleGrouped = computed(() => {
    const v = this.view();
    return v ? this.groupByModule(v.from_role) : [];
  });

  /**
   * True cuando el usuario no tiene overrides manuales — caso típico de
   * un admin recién creado. Permite mostrar un resumen compacto y amistoso
   * en lugar de tres tarjetas "Sin grants/Sin revokes/Permisos efectivos".
   */
  readonly hasNoManualOverrides = computed<boolean>(
    () => this.grantChips().length === 0 && this.revokeChips().length === 0,
  );

  readonly grantChips = computed(() => {
    const view = this.view();
    if (!view) return [];
    return view.grants.map(code => this.toChip(code, 'grant'));
  });

  readonly revokeChips = computed(() => {
    const view = this.view();
    if (!view) return [];
    return view.revokes.map(code => this.toChip(code, 'revoke'));
  });

  readonly effectiveCount = computed(() => this.view()?.effective.length ?? 0);
  readonly catalogTotal = ALL_PERMISSION_CODES.length;

  readonly userRoleName = computed(() => this.view()?.user.role.name ?? '');

  /** ID del target del drawer — null hasta cargar. */
  readonly targetUserId = computed<number | null>(() => this.view()?.user.id ?? null);

  /** True si el target es el current user (`auth.sub` === `view.user.id`). */
  readonly isSelfTarget = computed<boolean>(() => {
    const target = this.targetUserId();
    const subRaw = this.auth.getTokenPayload()?.sub;
    if (target == null || subRaw == null) return false;
    return String(subRaw) === String(target);
  });

  readonly isAdminTarget = computed<boolean>(
    () => this.view()?.user.role.name === 'admin',
  );

  /**
   * El backend de Stream A puede o no incluir `is_main_admin` en el shape
   * `UserPermissionsView.user`. Cuando no viene, el frontend lo trata
   * como `false` — el server hace la validación canónica.
   */
  readonly isMainAdminTarget = computed<boolean>(
    () => Boolean(this.view()?.user.is_main_admin),
  );

  /**
   * Set canónico de codes con override (después de aplicar cambios).
   * Se usa para `effectiveAfterChange` y para el cálculo del diff.
   */
  private readonly effectiveOverrides = computed<ReadonlyMap<string, OverrideEffect>>(() => {
    const original = this.originalOverrides();
    const selected = this.selectedOverrides();
    const result = new Map(original);
    for (const [code, effect] of selected) {
      if (effect == null) {
        // null = remover override → volver al default
        result.delete(code);
      } else {
        result.set(code, effect);
      }
    }
    return result;
  });

  /**
   * Set de perms efectivos previsualizando los cambios del usuario.
   * `(from_role ∪ grants_efectivos) − revokes_efectivos`.
   */
  readonly effectiveAfterChange = computed<ReadonlySet<string>>(() => {
    const v = this.view();
    if (!v) return new Set();
    const set = new Set<string>(v.from_role);
    for (const [code, effect] of this.effectiveOverrides()) {
      if (effect === 'grant') set.add(code);
      else if (effect === 'revoke') set.delete(code);
    }
    return set;
  });

  /**
   * Counts pintados en el header en edit mode.
   * `grantsCount`/`revokesCount` reflejan los overrides VIVOS post-cambio.
   */
  readonly liveGrantsCount = computed<number>(() => {
    let n = 0;
    for (const eff of this.effectiveOverrides().values()) if (eff === 'grant') n++;
    return n;
  });

  readonly liveRevokesCount = computed<number>(() => {
    let n = 0;
    for (const eff of this.effectiveOverrides().values()) if (eff === 'revoke') n++;
    return n;
  });

  /** Diff vivo computado contra el snapshot original. */
  readonly diff = computed<OverridesDiff>(() => this.computeDiff());

  /** True si hay algún cambio pendiente. */
  readonly dirty = computed<boolean>(() => {
    const d = this.diff();
    return d.added.length + d.removed.length + d.changed.length > 0;
  });

  /** True si algún `added` es grant de perm crítico a target NO-admin. */
  readonly hasCriticalGrantToNonAdmin = computed<boolean>(() => {
    if (this.isAdminTarget()) return false;
    const cat = this.catalog();
    const critByCode = new Map(cat.map(p => [p.code, isCriticalPermission(p)] as const));
    for (const a of this.diff().added) {
      if (a.effect !== 'grant') continue;
      const isCrit = critByCode.get(a.permission_code)
        ?? CRITICAL_PERMS_FALLBACK.has(a.permission_code);
      if (isCrit) return true;
    }
    // También considerar `changed` que termine en grant
    for (const c of this.diff().changed) {
      if (c.to !== 'grant') continue;
      const isCrit = critByCode.get(c.permission_code)
        ?? CRITICAL_PERMS_FALLBACK.has(c.permission_code);
      if (isCrit) return true;
    }
    return false;
  });

  /** True si la operación dejaría al usuario SIN perms efectivos. */
  readonly effectiveWouldBeEmpty = computed<boolean>(
    () => this.effectiveAfterChange().size === 0,
  );

  /**
   * Lista de codes críticos que se otorgan a un target no-admin (para
   * mostrarlos en el banner del modal).
   */
  readonly criticalGrantsToNonAdminList = computed<string[]>(() => {
    if (!this.hasCriticalGrantToNonAdmin()) return [];
    const cat = this.catalog();
    const critByCode = new Map(cat.map(p => [p.code, isCriticalPermission(p)] as const));
    const out = new Set<string>();
    for (const a of this.diff().added) {
      if (a.effect !== 'grant') continue;
      const isCrit = critByCode.get(a.permission_code)
        ?? CRITICAL_PERMS_FALLBACK.has(a.permission_code);
      if (isCrit) out.add(a.permission_code);
    }
    for (const c of this.diff().changed) {
      if (c.to !== 'grant') continue;
      const isCrit = critByCode.get(c.permission_code)
        ?? CRITICAL_PERMS_FALLBACK.has(c.permission_code);
      if (isCrit) out.add(c.permission_code);
    }
    return [...out].sort();
  });

  /** Secciones del catálogo agrupadas por módulo para render. */
  readonly sections = computed<ModuleSection[]>(() => this.buildSections());

  /** True si el target user es protegido (no puede revocar perms críticos). */
  readonly isProtectedTarget = computed<boolean>(
    () => this.isSelfTarget() || this.isMainAdminTarget() || this.isAdminTarget(),
  );

  // Infra --------------------------------------------------------------------
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(UserPermissionsService);
  private readonly adminRbac = inject(AdminRbacService);
  private readonly auth = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(ToastService);

  /** Tracker para no spamear el toast de bloqueo crítico en cada click. */
  private criticalLockoutToastShown = false;

  constructor() {
    // Bloquea el scroll del body sólo cuando el drawer está montado y abierto.
    effect(() => {
      const open = this.isOpen();
      if (typeof document === 'undefined') return;
      if (open) {
        document.body.classList.add('overflow-hidden');
      } else {
        document.body.classList.remove('overflow-hidden');
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('overflow-hidden');
    }
  }

  // Handlers -----------------------------------------------------------------
  onBackdropClick(): void {
    // En edit mode con dirty no cerramos por descuido — el usuario tiene
    // que confirmar el descarte por el botón Cancelar.
    if (this.isEditMode() && this.dirty()) return;
    if (this.saving()) return;
    this.closed.emit();
  }

  onCloseClick(): void {
    if (this.saving()) return;
    if (this.isEditMode() && this.dirty()) {
      this.toast.confirm(
        'Descartar cambios',
        'Tenés cambios sin guardar. ¿Querés descartarlos y cerrar?',
        'Sí, descartar',
        'Volver',
      ).then(result => {
        if (!result.isConfirmed) return;
        this.exitEditModeWithoutConfirm();
        this.closed.emit();
      });
      return;
    }
    this.closed.emit();
  }

  // Fetch --------------------------------------------------------------------
  private load(userId: number): void {
    this.state.set('loading');
    this.view.set(null);
    this.overrides.set([]);
    this.catalog.set([]);
    this.isEditMode.set(false);
    this.saving.set(false);
    this.originalOverrides.set(new Map());
    this.selectedOverrides.set(new Map());
    this.confirmingDiff.set(false);
    this.criticalLockoutToastShown = false;

    forkJoin({
      view: this.service.getEffectivePermissions(userId),
      overrides: this.service.getOverrides(userId),
      catalog: this.adminRbac.getPermissionsCatalog(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ view, overrides, catalog }) => {
          this.view.set(view);
          this.overrides.set(overrides);
          this.catalog.set(catalog ?? []);
          this.originalOverrides.set(this.buildOriginalMap(view));
          this.state.set('content');
        },
        error: () => {
          this.state.set('error');
        },
      });
  }

  private buildOriginalMap(view: UserPermissionsView): ReadonlyMap<string, OverrideEffect> {
    const m = new Map<string, OverrideEffect>();
    for (const code of view.grants) m.set(code, 'grant');
    for (const code of view.revokes) m.set(code, 'revoke');
    return m;
  }

  private resetState(): void {
    this.state.set('idle');
    this.view.set(null);
    this.overrides.set([]);
    this.catalog.set([]);
    this.isEditMode.set(false);
    this.saving.set(false);
    this.originalOverrides.set(new Map());
    this.selectedOverrides.set(new Map());
    this.confirmingDiff.set(false);
    this.criticalLockoutToastShown = false;
  }

  // ─── Edit mode ────────────────────────────────────────────────────────
  enterEditMode(): void {
    if (this.isEditMode()) return;
    if (this.state() !== 'content') return;
    // Empezamos con un Map vacío de cambios; los lookups caen al original.
    this.selectedOverrides.set(new Map());
    this.criticalLockoutToastShown = false;
    this.isEditMode.set(true);
  }

  cancelEdit(): void {
    if (!this.isEditMode()) return;
    if (!this.dirty()) {
      this.exitEditModeWithoutConfirm();
      return;
    }
    this.toast.confirm(
      'Descartar cambios',
      'Vas a perder los cambios pendientes. ¿Continuar?',
      'Sí, descartar',
      'Volver',
    ).then(result => {
      if (!result.isConfirmed) return;
      this.exitEditModeWithoutConfirm();
    });
  }

  private exitEditModeWithoutConfirm(): void {
    this.selectedOverrides.set(new Map());
    this.isEditMode.set(false);
    this.confirmingDiff.set(false);
    this.criticalLockoutToastShown = false;
  }

  /**
   * Lookup del estado vivo de un permiso en edit mode:
   *  - Si el usuario lo modificó vía `selectedOverrides`, ese es el valor.
   *  - Si no, leemos del original.
   *  - Si tampoco está, no hay override.
   */
  private getCurrentOverride(code: string): OverrideEffect | null {
    const selected = this.selectedOverrides();
    if (selected.has(code)) {
      // Puede ser un override activo o `null` (override removido).
      const val = selected.get(code) ?? null;
      return val;
    }
    return this.originalOverrides().get(code) ?? null;
  }

  /**
   * Computa el estado tri-state visible de un permiso.
   * Combina el set del rol con el override vivo (en edit o canónico).
   */
  getStateForPerm(code: string): OverrideState {
    const inRole = this.view()?.from_role.includes(code) ?? false;
    const eff = this.getCurrentOverride(code);
    if (eff === 'grant') return 'grant';
    if (eff === 'revoke') return 'revoke';
    return inRole ? 'inherited' : 'not_assigned';
  }

  /**
   * True si esta perm tiene override activo (visible o pendiente) — controla
   * la visibilidad del botón "↺ revert" en el row.
   */
  hasActiveOverride(code: string): boolean {
    return this.getCurrentOverride(code) !== null;
  }

  /**
   * Cicla el estado tri-state. Lógica:
   *  - Si la perm está en el rol: cicla entre `inherited` ↔ `revoke`.
   *  - Si NO está en el rol: cicla entre `not_assigned` ↔ `grant`.
   *  - Bloqueado para perms críticas en revoke cuando target es admin/main/self.
   */
  cyclePerm(code: string, ev?: Event): void {
    if (!this.isEditMode() || this.saving()) return;

    const perm = this.catalog().find(p => p.code === code);
    const isCrit = perm ? isCriticalPermission(perm) : CRITICAL_PERMS_FALLBACK.has(code);
    const inRole = this.view()?.from_role.includes(code) ?? false;
    const current = this.getCurrentOverride(code);

    // Determinar el "target" del próximo estado para validar lockouts
    let nextEffect: OverrideEffect | null;
    if (inRole) {
      // ciclo: inherited (null) ↔ revoke
      nextEffect = current === 'revoke' ? null : 'revoke';
    } else {
      // ciclo: not_assigned (null) ↔ grant
      nextEffect = current === 'grant' ? null : 'grant';
    }

    // Bloqueo: revoke crítico sobre target protegido.
    if (
      nextEffect === 'revoke' &&
      isCrit &&
      this.isProtectedTarget()
    ) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (!this.criticalLockoutToastShown) {
        this.toast.warning(
          'No se pueden revocar permisos críticos a admins, al main_admin o a tu propio usuario.',
        );
        this.criticalLockoutToastShown = true;
      }
      return;
    }

    this.applyNextEffect(code, nextEffect);
  }

  /** Aplica el nuevo effect al Map de cambios (memoizando "back to original"). */
  private applyNextEffect(code: string, nextEffect: OverrideEffect | null): void {
    const original = this.originalOverrides().get(code) ?? null;
    const next = new Map(this.selectedOverrides());
    if (nextEffect === original) {
      // Vuelve al estado original: limpiar entry si existía
      next.delete(code);
    } else {
      next.set(code, nextEffect);
    }
    this.selectedOverrides.set(next);
  }

  /** Botón mini ↺: vuelve la perm al default (sin override). */
  revertPerm(code: string, ev?: Event): void {
    if (!this.isEditMode() || this.saving()) return;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    this.applyNextEffect(code, null);
  }

  /** Quita todos los overrides — pide confirm primero. */
  clearAllOverrides(): void {
    if (!this.isEditMode() || this.saving()) return;
    if (this.effectiveOverrides().size === 0) return;

    this.toast.confirm(
      'Quitar todos los overrides',
      'Se removerán todos los grants y revokes manuales del usuario. ¿Continuar?',
      'Sí, quitar',
      'Cancelar',
    ).then(result => {
      if (!result.isConfirmed) return;
      const next = new Map<string, OverrideEffect | null>();
      for (const code of this.originalOverrides().keys()) {
        next.set(code, null);
      }
      this.selectedOverrides.set(next);
    });
  }

  // ─── Diff modal ────────────────────────────────────────────────────────
  openDiffModal(): void {
    if (!this.dirty()) return;
    this.confirmingDiff.set(true);
  }

  closeDiffModal(): void {
    if (this.saving()) return;
    this.confirmingDiff.set(false);
  }

  /**
   * Dispara el PUT con la lista de overrides resultantes.
   * Tras éxito hidratamos desde la response y, si el target es self,
   * refrescamos `PermissionService` para que `*appCan` reaccione.
   */
  applyDiff(): void {
    const targetId = this.targetUserId();
    if (targetId == null) return;
    if (!this.dirty()) return;
    if (this.saving()) return;

    const payload = this.buildOverridesPayload();
    this.saving.set(true);

    this.service.updateOverrides(targetId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.view.set(res.permissions);
          this.overrides.set(res.overrides);
          this.originalOverrides.set(this.buildOriginalMap(res.permissions));
          this.selectedOverrides.set(new Map());
          this.isEditMode.set(false);
          this.confirmingDiff.set(false);
          this.saving.set(false);
          this.criticalLockoutToastShown = false;

          this.toast.success('Overrides actualizados');

          if (this.isSelfTarget()) {
            this.permissionService.refresh().subscribe({
              error: () => {
                this.toast.warning(
                  'No se pudieron sincronizar tus permisos. Cerrá sesión y volvé a entrar.',
                );
              },
            });
          }
        },
        error: err => {
          this.saving.set(false);
          this.toast.error(this.describeError(err));
        },
      });
  }

  /** Lista canónica de overrides resultantes tras los cambios. */
  private buildOverridesPayload(): OverrideEntry[] {
    const result: OverrideEntry[] = [];
    for (const [code, effect] of this.effectiveOverrides()) {
      result.push({ permission_code: code, effect });
    }
    return result;
  }

  /** Mapea el error HTTP a un mensaje legible para el toast. */
  private describeError(err: unknown): string {
    const e = err as { status?: number; error?: { msg?: string; detail?: string } };
    const status = e?.status;
    const backendMsg = e?.error?.msg ?? e?.error?.detail;
    if (status === 403) {
      return backendMsg
        || 'No autorizado: lockout de seguridad (self/main_admin/admin).';
    }
    if (status === 404) {
      return backendMsg || 'Algún permiso no existe en el catálogo.';
    }
    if (status === 422) {
      return backendMsg || 'Validación falló: revisa los overrides enviados.';
    }
    return backendMsg || 'No se pudieron guardar los overrides.';
  }

  // ─── Diff cálculo ────────────────────────────────────────────────────
  private computeDiff(): OverridesDiff {
    const original = this.originalOverrides();
    const selected = this.selectedOverrides();
    const added: OverrideEntry[] = [];
    const removed: OverrideEntry[] = [];
    const changed: { permission_code: string; from: OverrideEffect; to: OverrideEffect }[] = [];

    for (const [code, eff] of selected) {
      const origEff = original.get(code);
      if (eff === null) {
        // Revert: si había override original lo cuento como removed.
        if (origEff != null) {
          removed.push({ permission_code: code, effect: origEff });
        }
        // Si no había, no-op.
      } else {
        // Override activo en edit mode
        if (origEff === undefined) {
          // No estaba en original → added
          added.push({ permission_code: code, effect: eff });
        } else if (origEff !== eff) {
          // Estaba con otro effect → changed
          changed.push({ permission_code: code, from: origEff, to: eff });
        }
        // Si origEff === eff → no-op (debería haberse limpiado por applyNextEffect)
      }
    }

    added.sort((a, b) => a.permission_code.localeCompare(b.permission_code));
    removed.sort((a, b) => a.permission_code.localeCompare(b.permission_code));
    changed.sort((a, b) => a.permission_code.localeCompare(b.permission_code));

    return { added, removed, changed };
  }

  // ─── Secciones del catálogo ──────────────────────────────────────────
  /**
   * Construye las secciones por módulo según el catálogo cargado.
   * Cada row contiene el estado actual y flags visuales precomputados.
   */
  private buildSections(): ModuleSection[] {
    const cat = this.catalog();
    if (cat.length === 0) return [];

    const inRole = new Set(this.view()?.from_role ?? []);
    const protectedTarget = this.isProtectedTarget();
    const adminTarget = this.isAdminTarget();

    const byModule = new Map<string, PermRow[]>();
    for (const p of cat) {
      const modKey = this.resolveModuleKey(p);
      const state = this.getStateForPerm(p.code);
      const isCrit = isCriticalPermission(p);
      const isRevokeLocked = isCrit && protectedTarget;
      const isElevation = isCrit && !adminTarget && state === 'grant';
      const row: PermRow = {
        perm: p,
        state,
        isElevation,
        isRevokeLocked,
        hasOverride: state === 'grant' || state === 'revoke',
      };
      // Side-effect — silenciamos el lint sobre `inRole`. (Reservado por
      // si la lógica de visibilidad cambia.)
      void inRole;
      const bucket = byModule.get(modKey);
      if (bucket) bucket.push(row);
      else byModule.set(modKey, [row]);
    }

    const ordered: ModuleSection[] = [];
    const seen = new Set<string>();
    for (const cfg of MODULE_ORDER) {
      seen.add(cfg.key);
      const rows = byModule.get(cfg.key);
      if (rows && rows.length > 0) {
        ordered.push({
          key: cfg.key,
          label: cfg.label,
          rows: rows.slice().sort((a, b) => a.perm.code.localeCompare(b.perm.code)),
        });
      }
    }
    // Catch-all "Otros" para módulos no listados.
    const leftover: PermRow[] = [];
    for (const [key, rows] of byModule) {
      if (!seen.has(key)) leftover.push(...rows);
    }
    if (leftover.length > 0) {
      ordered.push({
        key: 'otros',
        label: 'Otros',
        rows: leftover.slice().sort((a, b) => a.perm.code.localeCompare(b.perm.code)),
      });
    }
    return ordered;
  }

  private resolveModuleKey(p: Permission): string {
    if (p.code === 'users.read_permissions') return 'users';
    return p.module || (p.code.includes('.') ? p.code.split('.', 1)[0] : 'otros');
  }

  // Helpers de presentación --------------------------------------------------
  /**
   * Agrupa codes por módulo (parte antes del primer `.`) preservando el
   * orden alfabético dentro del grupo. El orden de los grupos sigue el
   * orden con que aparecen en `ALL_PERMISSION_CODES` para que coincida
   * con la convención del catálogo (Users → Roles → Audit → ...).
   */
  private groupByModule(codes: readonly string[]): GroupedEntry[] {
    if (!codes || codes.length === 0) return [];

    const buckets = new Map<string, string[]>();
    for (const code of codes) {
      const moduleKey = code.includes('.') ? code.split('.', 1)[0] : code;
      const arr = buckets.get(moduleKey);
      if (arr) arr.push(code); else buckets.set(moduleKey, [code]);
    }

    const catalogOrder = new Map<string, number>();
    ALL_PERMISSION_CODES.forEach((c, idx) => {
      const m = c.includes('.') ? c.split('.', 1)[0] : c;
      if (!catalogOrder.has(m)) catalogOrder.set(m, idx);
    });

    const descByCode = new Map(this.catalog().map(p => [p.code, p.description] as const));

    return [...buckets.entries()]
      .sort(([a], [b]) => {
        const ai = catalogOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
        const bi = catalogOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      })
      .map(([module, codes]) => ({
        module,
        moduleLabel: MODULE_LABELS[module] ?? module,
        items: [...codes].sort().map(code => ({
          code,
          description: descByCode.get(code) ?? '',
        })),
      }));
  }

  private toChip(code: string, effect: OverrideEffect): OverrideChip {
    const meta = this.overrides().find(
      o => o.permission.code === code && o.effect === effect,
    );
    const byEmail = meta?.granted_by?.email ?? null;
    const atIso = meta?.granted_at ?? '';
    const atLabel = atIso ? this.formatIso(atIso) : '';
    const tooltipParts: string[] = [];
    if (byEmail) tooltipParts.push(`Por: ${byEmail}`);
    if (atLabel) tooltipParts.push(`Fecha: ${atLabel}`);
    return {
      code,
      effect,
      byEmail,
      atIso,
      atLabel,
      tooltip: tooltipParts.join(' — ') || code,
    };
  }

  /**
   * Formato amigable para ISO 8601 (`2025-01-15T10:30:00Z`).
   * No usamos `DatePipe` para no añadir dependencias al template y para
   * controlar exactamente el output en los tests.
   */
  private formatIso(iso: string): string {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  }

  /** Resuelve la clase del badge de rol — mismo mapeo que users-list. */
  roleBadgeClasses(roleName: string): string {
    switch (roleName) {
      case 'admin':   return 'bg-orange-100 text-orange-800';
      case 'editor':  return 'bg-blue-100 text-blue-800';
      case 'viewer':  return 'bg-zinc-100 text-zinc-700';
      case 'monitor': return 'bg-purple-100 text-purple-800';
      default:        return 'bg-yellow-100 text-yellow-800';
    }
  }

  // ─── Helpers para el template ────────────────────────────────────────
  /** Tooltip humano para la pill según el estado. */
  pillTooltip(row: PermRow): string {
    if (row.isRevokeLocked && row.state !== 'revoke') {
      return 'Permiso crítico — no se puede revocar para este usuario';
    }
    if (row.isElevation) {
      return 'Privilegio elevado: grant crítico a un usuario sin rol admin';
    }
    switch (row.state) {
      case 'grant': return 'Otorgado manualmente';
      case 'revoke': return 'Revocado manualmente';
      case 'inherited': return 'Heredado del rol';
      case 'not_assigned': return 'Sin asignar';
    }
  }
}

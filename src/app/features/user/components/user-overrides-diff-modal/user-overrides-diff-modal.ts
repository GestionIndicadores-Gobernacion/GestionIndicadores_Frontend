/**
 * Modal de confirmación del diff de overrides de un usuario (D3).
 *
 * Se monta como child del `user-permissions-drawer` cuando el usuario
 * aprieta "Guardar cambios". Muestra:
 *  - Banners contextuales (self-edit, main_admin, shadow mode, escalación
 *    crítica a no-admin, lockout sin perms efectivos).
 *  - Cuatro secciones (added grants/revokes, removed, changed).
 *  - Footer con Cancelar / Confirmar (+ spinner cuando saving).
 *
 * Body-lock con effect (mismo patrón que `role-permissions-diff-modal`).
 */
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  computed,
  effect,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import {
  OverrideEntry,
  UserPermissionsView,
} from '../../services/user-permissions.service';
import { OverridesDiff } from '../user-permissions-drawer/user-permissions-drawer';

@Component({
  selector: 'app-user-overrides-diff-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-overrides-diff-modal.html',
})
export class UserOverridesDiffModalComponent implements OnDestroy {

  /**
   * Cuando es null, el modal se desmonta y libera el body-lock. Cuando es
   * truthy se muestra. Usamos un signal interno para que `isOpen` y los
   * derivados reaccionen.
   */
  @Input()
  set targetUser(value: UserPermissionsView['user'] | null) {
    this._targetUser.set(value ?? null);
  }
  get targetUser(): UserPermissionsView['user'] | null {
    return this._targetUser();
  }

  @Input()
  set diff(value: OverridesDiff | null) {
    this._diff.set(value ?? { added: [], removed: [], changed: [] });
  }
  get diff(): OverridesDiff {
    return this._diff();
  }

  @Input() isSelfTarget: boolean = false;
  @Input() isMainAdminTarget: boolean = false;
  @Input() isAdminTarget: boolean = false;
  @Input() shadowMode: boolean = false;
  @Input() saving: boolean = false;
  @Input() effectiveWouldBeEmpty: boolean = false;
  @Input() hasCriticalGrantToNonAdmin: boolean = false;
  /** Codes críticos otorgados (subset de added grants) — para listar en el banner. */
  @Input() criticalGrantList: ReadonlyArray<string> = [];

  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  private readonly _targetUser = signal<UserPermissionsView['user'] | null>(null);
  private readonly _diff = signal<OverridesDiff>({ added: [], removed: [], changed: [] });

  /** True mientras el modal está visible — controla body-lock. */
  readonly isOpen = computed(() => this._targetUser() !== null);

  // ─── Derivados ──────────────────────────────────────────────────────
  readonly addedGrants = computed<OverrideEntry[]>(
    () => this._diff().added.filter(a => a.effect === 'grant'),
  );

  readonly addedRevokes = computed<OverrideEntry[]>(
    () => this._diff().added.filter(a => a.effect === 'revoke'),
  );

  readonly removedItems = computed<OverrideEntry[]>(() => this._diff().removed);

  readonly changedItems = computed(() => this._diff().changed);

  readonly hasAddedGrants = computed(() => this.addedGrants().length > 0);
  readonly hasAddedRevokes = computed(() => this.addedRevokes().length > 0);
  readonly hasRemoved = computed(() => this.removedItems().length > 0);
  readonly hasChanged = computed(() => this.changedItems().length > 0);

  readonly displayName = computed<string>(() => {
    const u = this._targetUser();
    if (!u) return '';
    return u.email || `Usuario #${u.id}`;
  });

  constructor() {
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

  onBackdropClick(): void {
    if (this.saving) return;
    this.cancel.emit();
  }

  onCancelClick(): void {
    if (this.saving) return;
    this.cancel.emit();
  }

  onConfirmClick(): void {
    if (this.saving) return;
    this.confirm.emit();
  }
}

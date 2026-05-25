/**
 * Modal de confirmación del diff de permisos de un rol.
 *
 * Se monta como child de `role-detail` cuando el usuario aprieta "Guardar
 * cambios" sobre la matriz editable. Muestra dos secciones (added/removed),
 * banners contextuales (self-edit, shadow mode), un line item con el conteo
 * de usuarios afectados y emite (`confirm`)/(`cancel`).
 *
 * El padre es responsable de:
 *  - Disparar el PUT al recibir `(confirm)`.
 *  - Pasar `[saving]=true` durante la request para mostrar el spinner.
 *  - Cerrar el modal cuando el ciclo termina (éxito o error).
 *
 * Body-lock con `effect` (mismo patrón que `user-permissions-drawer`).
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

import { RoleDetail, RolePermissionsDiff } from '../../models/admin.model';

@Component({
  selector: 'app-role-permissions-diff-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-permissions-diff-modal.html',
  styleUrls: ['./role-permissions-diff-modal.css'],
})
export class RolePermissionsDiffModalComponent implements OnDestroy {

  /**
   * Cuando cambia a un valor truthy el modal queda visible. Si pasa a
   * `null` se desmonta y libera el body-lock.
   */
  @Input()
  set role(value: RoleDetail | null) {
    this._role.set(value ?? null);
  }
  get role(): RoleDetail | null {
    return this._role();
  }

  @Input()
  set diff(value: RolePermissionsDiff) {
    this._diff.set(value ?? { added: [], removed: [] });
  }
  get diff(): RolePermissionsDiff {
    return this._diff();
  }

  @Input() totalUsers: number = 0;
  @Input() shadowMode: boolean = false;
  @Input() isSelfRole: boolean = false;
  @Input() saving: boolean = false;

  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  private readonly _role = signal<RoleDetail | null>(null);
  private readonly _diff = signal<RolePermissionsDiff>({ added: [], removed: [] });

  /** True mientras el modal está visible — controla body-lock. */
  readonly isOpen = computed(() => this._role() !== null);

  readonly added = computed(() => this._diff().added);
  readonly removed = computed(() => this._diff().removed);
  readonly hasAdded = computed(() => this.added().length > 0);
  readonly hasRemoved = computed(() => this.removed().length > 0);

  constructor() {
    // Body-lock: idéntico patrón que el drawer de permisos. El cleanup
    // ocurre automáticamente cuando `isOpen` pasa a false o el componente
    // se destruye.
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

// Directiva estructural de visibilidad por permisos. Convive con el modelo
// basado en rol durante Fase C: `fallbackRole` permite seguir mostrando UI
// a roles canónicos mientras `role_permissions` termina de cubrir el catálogo.
import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
} from '@angular/core';

import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { PermCode, RoleId } from '../../core/constants/permissions';

@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class CanDirective {

  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly perms = inject(PermissionService);
  private readonly auth = inject(AuthService);

  private _codes: readonly PermCode[] | null = null;
  private _mode: 'any' | 'all' = 'any';
  private _fallbackRoles: readonly RoleId[] | null = null;
  private _rendered = false;

  @Input({ alias: 'appCan' })
  set codes(value: PermCode | readonly PermCode[] | null | undefined) {
    if (value == null) {
      this._codes = null;
    } else if (Array.isArray(value)) {
      this._codes = value as readonly PermCode[];
    } else {
      this._codes = [value as PermCode];
    }
    this.update();
  }

  @Input({ alias: 'appCanMode' })
  set mode(value: 'any' | 'all') {
    this._mode = value === 'all' ? 'all' : 'any';
    this.update();
  }

  @Input({ alias: 'appCanFallbackRole' })
  set fallbackRole(value: RoleId | readonly RoleId[] | null | undefined) {
    if (value == null) {
      this._fallbackRoles = null;
    } else if (Array.isArray(value)) {
      this._fallbackRoles = value as readonly RoleId[];
    } else {
      this._fallbackRoles = [value as RoleId];
    }
    this.update();
  }

  constructor() {
    // Re-evalúa cuando el set de permisos cambia (login/logout/refresh).
    effect(() => {
      this.perms.version();
      this.update();
    });
  }

  private update(): void {
    const codes = this._codes;
    let visible: boolean;

    if (!codes || codes.length === 0) {
      visible = true;
    } else {
      const granted = this._mode === 'all'
        ? this.perms.hasAll(...codes)
        : this.perms.hasAny(...codes);

      if (granted) {
        visible = true;
      } else if (this._fallbackRoles && this._fallbackRoles.length > 0) {
        const roleId = this.auth.getTokenPayload()?.role_id ?? null;
        visible = roleId != null && this._fallbackRoles.includes(roleId as RoleId);
      } else {
        visible = false;
      }
    }

    if (visible && !this._rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this._rendered = true;
    } else if (!visible && this._rendered) {
      this.vcr.clear();
      this._rendered = false;
    }
  }
}

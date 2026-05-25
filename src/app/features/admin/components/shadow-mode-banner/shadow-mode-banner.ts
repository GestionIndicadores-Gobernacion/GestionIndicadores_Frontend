import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { SHADOW_MODE_ENABLED } from '../../../../core/constants/feature-flags';

/**
 * Banner informativo del modo paralelo de RBAC.
 *
 * Se muestra en pantallas admin mientras `SHADOW_MODE_ENABLED === true`.
 * Si el caller pasa `[visible]` explícito, se usa ese valor; si no, lee
 * la feature flag global.
 *
 * Visual: card amarilla suave con ícono `triangle-alert` y texto cómodo.
 * No es agresivo — es un info, no un error.
 */
@Component({
  selector: 'app-shadow-mode-banner',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shadow-mode-banner.html',
})
export class ShadowModeBannerComponent {
  /**
   * Visibilidad explícita del banner. Si es `null`/`undefined`, cae al
   * valor de `SHADOW_MODE_ENABLED`. Permite forzar `false` en tests u
   * ocultarlo en pantallas que ya tengan otro indicador.
   */
  @Input() visible: boolean | null = null;

  get shouldRender(): boolean {
    return this.visible == null ? SHADOW_MODE_ENABLED : this.visible;
  }
}

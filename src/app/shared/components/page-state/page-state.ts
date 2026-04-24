import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type PageState = 'loading' | 'error' | 'empty' | 'content';

/**
 * Placeholder canónico para estados de pantalla.
 *
 *   <app-page-state [state]="state" [errorMessage]="err"
 *                   emptyMessage="Sin resultados"
 *                   (retry)="reload()">
 *     <!-- contenido normal cuando state === 'content' -->
 *     <table>...</table>
 *   </app-page-state>
 *
 * Pensado para uniformar listados, dashboards y detalles. No hace
 * decisiones de negocio: solo alterna la UI según `state`.
 */
@Component({
  selector: 'app-page-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container [ngSwitch]="state">

      <!-- LOADING -->
      <div *ngSwitchCase="'loading'"
           class="flex flex-col items-center justify-center gap-3 py-12 text-[#4A6A9B]">
        <div class="w-8 h-8 rounded-full border-2 border-[#D6E0F0] border-t-[#2d5fa8] animate-spin"></div>
        <p class="text-xs font-semibold">{{ loadingMessage }}</p>
      </div>

      <!-- ERROR -->
      <div *ngSwitchCase="'error'"
           class="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center"
           style="color:#991B1B;">
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center" style="background:#FEE2E2;">
          <lucide-icon name="alert-triangle" [size]="20" [strokeWidth]="1.8" color="#B91C1C"></lucide-icon>
        </div>
        <p class="text-sm font-semibold">{{ errorMessage }}</p>
        <button *ngIf="retry.observed"
                type="button"
                (click)="retry.emit()"
                class="text-[11px] font-semibold px-3 py-1.5 rounded-lg border hover:bg-[#FEF2F2]"
                style="border-color:#FCA5A5;color:#991B1B;">
          Reintentar
        </button>
      </div>

      <!-- EMPTY -->
      <div *ngSwitchCase="'empty'"
           class="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center"
           style="color:#7C94BD;">
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center" style="background:#F0F4FA;">
          <lucide-icon [name]="emptyIcon" [size]="20" [strokeWidth]="1.8" color="#4A6A9B"></lucide-icon>
        </div>
        <p class="text-sm font-semibold" style="color:#1B3A6B;">{{ emptyMessage }}</p>
        <p *ngIf="emptyHint" class="text-xs">{{ emptyHint }}</p>
      </div>

      <!-- CONTENT -->
      <ng-content *ngSwitchDefault></ng-content>

    </ng-container>
  `,
})
export class PageStateComponent {

  @Input() state: PageState = 'content';

  @Input() loadingMessage = 'Cargando…';
  @Input() errorMessage = 'No se pudieron cargar los datos.';
  @Input() emptyMessage = 'No hay información para mostrar';
  @Input() emptyHint: string | null = null;
  @Input() emptyIcon = 'inbox';

  @Output() retry = new EventEmitter<void>();
}

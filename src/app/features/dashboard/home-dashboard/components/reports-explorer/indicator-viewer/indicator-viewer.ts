import { CommonModule } from '@angular/common';
import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import {
  ComponentAggregate, IndicatorDetail,
} from '../../../../../../features/report/models/report-aggregate.model';
import { ReportModel } from '../../../../../../features/report/models/report.model';
import { BarClickEvent } from '../reports-explorer-chart/chart-builder.service';
import { ReportsExplorerChartComponent } from '../reports-explorer-chart/reports-explorer-chart';
import { LocationYearConsolidatedComponent } from '../location-year-consolidated/location-year-consolidated';
import {
  DEFAULT_VIEWER_MODE, INDICATOR_VIEWER_MODES,
  IndicatorViewerMode, IndicatorViewerModeId,
} from './indicator-viewer.modes';

interface ViewerPaneState {
  /** Existe en el DOM. */
  mounted: boolean;
  /** `null` = visible; `'none'` = montado pero oculto (keep-alive). */
  display: string | null;
}

function buildViewState(
  active: IndicatorViewerModeId,
  visited: Set<IndicatorViewerModeId>,
): Record<IndicatorViewerModeId, ViewerPaneState> {
  const state = {} as Record<IndicatorViewerModeId, ViewerPaneState>;
  for (const mode of INDICATOR_VIEWER_MODES) {
    const isActive = mode.id === active;
    state[mode.id] = {
      mounted: isActive || (!!mode.keepAlive && visited.has(mode.id)),
      display: isActive ? null : 'none',
    };
  }
  return state;
}

/**
 * Contenedor del bloque "Visualización del indicador".
 *
 * Es un shell de presentación: aporta la cabecera única, el selector de
 * modo y el conmutador del cuerpo. NO calcula ni pide datos — se limita a
 * reenviar los inputs/outputs que ya manejaba el explorador, para que
 * cada vista siga funcionando exactamente igual que antes.
 */
@Component({
  selector: 'app-indicator-viewer',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule,
    ReportsExplorerChartComponent, LocationYearConsolidatedComponent,
  ],
  templateUrl: './indicator-viewer.html',
})
export class IndicatorViewerComponent implements OnChanges {

  // ── Inputs de la vista "Gráficos" (pasan tal cual) ───────────────────
  @Input() componentAggregate: ComponentAggregate | null = null;
  @Input() selectedIndicator: IndicatorDetail | null = null;
  @Input() indicatorDetail: IndicatorDetail | null = null;
  @Input() selectedYear: number = new Date().getFullYear();
  @Input() allReports: ReportModel[] = [];

  /** Compartido por ambas vistas. */
  @Input() componentId: number | null = null;

  @Output() yearChange = new EventEmitter<number>();
  @Output() barClick = new EventEmitter<BarClickEvent>();

  readonly modes = INDICATOR_VIEWER_MODES;

  mode: IndicatorViewerModeId = DEFAULT_VIEWER_MODE;

  /**
   * Estado de montaje/visibilidad por modo, **precalculado**.
   *
   * El template lo lee como dato plano en vez de llamar métodos: un
   * `*ngIf` que invoca una función puede reevaluarse durante el pase de
   * verificación de Angular y disparar NG0100 si algún hijo fuerza su
   * propia detección de cambios en medio del ciclo. Aquí solo cambia en
   * `selectMode()` y `ngOnChanges()`, así que es estable dentro de un
   * mismo ciclo.
   */
  view: Record<IndicatorViewerModeId, ViewerPaneState> = buildViewState(
    DEFAULT_VIEWER_MODE,
    new Set<IndicatorViewerModeId>([DEFAULT_VIEWER_MODE]),
  );

  /**
   * Modos ya abiertos alguna vez. Junto con `keepAlive` permite montar
   * una vista solo cuando se pide por primera vez y conservarla después.
   */
  private visited = new Set<IndicatorViewerModeId>([DEFAULT_VIEWER_MODE]);

  ngOnChanges(changes: SimpleChanges): void {
    // Sin componente no hay nada que analizar: volvemos al modo por
    // defecto para que se vea el estado vacío de siempre.
    if (changes['componentId'] && this.componentId === null) {
      this.mode = DEFAULT_VIEWER_MODE;
      this.syncView();
    }
  }

  /** Las pestañas solo tienen sentido con un componente elegido. */
  get showModeSwitch(): boolean {
    return this.componentId !== null;
  }

  selectMode(id: IndicatorViewerModeId): void {
    if (this.mode === id) return;
    this.mode = id;
    this.visited.add(id);
    this.syncView();
  }

  isActive(id: IndicatorViewerModeId): boolean {
    return this.mode === id;
  }

  /** ¿Debe existir en el DOM? Activo, o keep-alive ya visitado. */
  isMounted(id: IndicatorViewerModeId): boolean {
    return this.view[id].mounted;
  }

  /** `display` del contenedor de un modo montado pero no activo. */
  displayFor(id: IndicatorViewerModeId): string | null {
    return this.view[id].display;
  }

  private syncView(): void {
    this.view = buildViewState(this.mode, this.visited);
  }

  trackByMode = (_: number, mode: IndicatorViewerMode) => mode.id;
}

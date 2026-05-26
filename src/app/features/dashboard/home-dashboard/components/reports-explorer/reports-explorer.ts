import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { LucideAngularModule } from 'lucide-angular';
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { COMPONENT_EXPLORER_CONFIG, DEFAULT_EXPLORER_CONFIG } from "../../../../../core/data/component-explorer-config";
import { getIndicatorDisplayName } from "../../../../../core/data/indicator-display-names";
import { AggregateByComponent, ComponentAggregate, ComponentIndicatorsAggregate, IndicatorDetail } from "../../../../../features/report/models/report-aggregate.model";
import { ReportsService } from "../../../../../features/report/services/reports.service";
import { BarClickEvent } from "./reports-explorer-chart/chart-builder.service";
import { ReportsExplorerChartComponent } from "./reports-explorer-chart/reports-explorer-chart";
import { getCbaVirtuals, getUnidadMovilVirtuals, getAtencionVeterinariaVirtuals, getDejandoHuellaVirtuals, getAlianzasAcademicasVirtuals, getExperienciasCulturalesVirtuals, getMesaPybaVirtuals, getGenericVirtuals, getEscuadronBenjiVirtuals, getAutosostenibilidadVirtuals, getAlianzasEstrategicasVirtuals, getRedAnimaliaAcompanamientoVirtuals, getJuntasDefensorasVirtuals, getPromotoresVirtuals } from "./virtual-indicators";
import { ReportModel } from "../../../../../features/report/models/report.model";
const PILLS_VISIBLE = 6;

const COMPONENT_VIRTUAL_MAP: Record<number, (agg: ComponentIndicatorsAggregate | null) => IndicatorDetail[]> = {
  7: (agg) => getCbaVirtuals(agg),
  8: (agg) => getUnidadMovilVirtuals(agg),
  9: (agg) => getAtencionVeterinariaVirtuals(agg),
  14: (agg) => getAutosostenibilidadVirtuals(agg),
  15: (agg) => getAlianzasEstrategicasVirtuals(agg),
  17: (agg) => getRedAnimaliaAcompanamientoVirtuals(agg),
  21: (agg) => getJuntasDefensorasVirtuals(agg),
  22: (agg) => getPromotoresVirtuals(agg),
  23: (agg) => getEscuadronBenjiVirtuals(agg),  // ← nuevo
  24: (agg) => getDejandoHuellaVirtuals(agg),
  25: (agg) => getAlianzasAcademicasVirtuals(agg),
  26: (agg) => getExperienciasCulturalesVirtuals(agg),
  28: (agg) => getMesaPybaVirtuals(agg),
};

@Component({
  selector: 'app-reports-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportsExplorerChartComponent, LucideAngularModule],
  templateUrl: './reports-explorer.html',
})
export class ReportsExplorerComponent implements OnChanges {

  @Input() strategyIds: number[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() selectedStrategyId: number | null = null;
  @Input() components: AggregateByComponent[] = [];
  @Input() selectedYear: number = new Date().getFullYear();

  @Input() dateFrom: string | null = null;
  @Input() dateTo: string | null = null;

  @Input() allReports: ReportModel[] = [];

  @Output() yearChange = new EventEmitter<number>();
  @Output() strategyChange = new EventEmitter<number>();

  selectedComponentId: number | null = null;
  componentAggregate: ComponentAggregate | null = null;
  selectedIndicator: IndicatorDetail | null = null;
  loadingComponent = false;
  indicatorsAggregate: ComponentIndicatorsAggregate | null = null;
  showAllIndicators = false;

  /**
   * Año efectivo usado internamente para queries y el binding al chart.
   * Se mantiene separado del @Input() selectedYear para no mutar el
   * input (anti-patrón que dispara NG0100 cuando el auto-fallback
   * cambia el año durante un ciclo de detección).
   */
  effectiveYear: number = new Date().getFullYear();

  get indicators(): IndicatorDetail[] {
    const config = this.selectedComponentId
      ? (COMPONENT_EXPLORER_CONFIG[this.selectedComponentId] ?? DEFAULT_EXPLORER_CONFIG)
      : DEFAULT_EXPLORER_CONFIG;

    const hidden = new Set(config.hiddenIndicators ?? []);

    const list = (this.indicatorsAggregate?.indicators ?? [])
      .filter(ind => !hidden.has(ind.indicator_id))
      .filter(ind => ind.indicator_id > 0)
      .map(ind => ({
        ...ind,
        indicator_name: getIndicatorDisplayName(ind.indicator_id, ind.indicator_name)
      }));

    // Virtuales genéricos (jornadas, municipios, subviews)
    const genericVirtuals = getGenericVirtuals(config, list, this.indicatorsAggregate);

    // Virtuales específicos del componente
    const specificVirtuals = this.selectedComponentId && COMPONENT_VIRTUAL_MAP[this.selectedComponentId]
      ? COMPONENT_VIRTUAL_MAP[this.selectedComponentId](this.indicatorsAggregate)
      : [];

    return [...genericVirtuals, ...specificVirtuals, ...list];
  }

  get visibleIndicators(): IndicatorDetail[] {
    if (this.showAllIndicators) return this.indicators;
    return this.indicators.slice(0, PILLS_VISIBLE);
  }

  get hiddenCount(): number {
    return Math.max(0, this.indicators.length - PILLS_VISIBLE);
  }

  get selectedIndicatorDetail(): IndicatorDetail | null {
    return this.selectedIndicator;
  }

  private destroyRef = inject(DestroyRef);

  constructor(
    private reportsService: ReportsService,
    private cd: ChangeDetectorRef,
    private router: Router,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedYear']) {
      this.effectiveYear = changes['selectedYear'].currentValue;
    }

    if (changes['components']) {
      if (!changes['components'].firstChange) {
        this.selectedComponentId = null;
        this.componentAggregate = null;
        this.selectedIndicator = null;
      }
      if (this.components.length > 0) {
        this.selectedComponentId = this.components[0].component_id;
        this.loadComponentData(this.components[0].component_id);
      }
    }

    // Recargar si cambia el rango de fechas
    if ((changes['dateFrom'] || changes['dateTo']) && !changes['dateFrom']?.firstChange) {
      if (this.selectedComponentId) {
        this.loadComponentData(this.selectedComponentId);
      }
    }

    // ← NUEVO: recargar si cambia el año desde el dashboard
    if (changes['selectedYear'] && !changes['selectedYear'].firstChange) {
      if (this.selectedComponentId) {
        this.loadComponentData(this.selectedComponentId);
      }
    }
  }

  /** Último año (desde `allReports`) en que el componente tiene reportes, o null. */
  private findLatestYearWithReports(componentId: number): number | null {
    const years = this.allReports
      .filter(r => r.component_id === componentId)
      .map(r => new Date(r.report_date).getFullYear())
      .filter(y => Number.isFinite(y));
    return years.length ? Math.max(...years) : null;
  }

  onChartBarClick(event: BarClickEvent): void {
    const params = new URLSearchParams();
    if (event.componentId) params.set('component', String(event.componentId));
    if (event.label) params.set('label', event.label);
    params.set('year', String(this.effectiveYear));

    window.open(`/reports?${params.toString()}`, '_blank');
  }

  private loadComponentData(id: number, isAutoFallback = false, yearOverride?: number): void {
    const queryYear = yearOverride ?? this.effectiveYear;
    this.loadingComponent = true;
    this.showAllIndicators = false;
    this.indicatorsAggregate = null;

    forkJoin({
      aggregate: this.reportsService.aggregateByComponent(
        id, queryYear,
        this.dateFrom ?? undefined,
        this.dateTo ?? undefined
      ),
      indicators: this.reportsService.aggregateIndicatorsByComponent(
        id, queryYear,
        this.dateFrom ?? undefined,
        this.dateTo ?? undefined
      )
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ aggregate, indicators }) => {
        // Si el componente no tiene reportes en `queryYear`, saltar
        // una sola vez al último año donde sí los tiene. Evita la
        // pantalla "Este componente aún no tiene registros" cuando la
        // realidad es que sí los tiene pero en otro año. El flag
        // `isAutoFallback` previene bucles si la retentativa también
        // vuelve vacía.
        const noData = (aggregate?.total_reports ?? 0) === 0;
        if (noData && !isAutoFallback) {
          const latest = this.findLatestYearWithReports(id);
          if (latest !== null && latest !== queryYear) {
            // Diferimos la mutación a un microtask para que no caiga
            // dentro del ciclo de CD actual (la HTTP subscribe puede
            // ejecutarse dentro del tick de zone.js que verifica
            // los bindings → NG0100 "Expression has changed after it
            // was checked"). El siguiente tick re-ejecuta el load
            // con el año correcto fuera del ciclo verificado.
            Promise.resolve().then(() => {
              this.effectiveYear = latest;
              this.loadComponentData(id, true, latest);
            });
            return;
          }
        }

        this.componentAggregate = aggregate;
        this.indicatorsAggregate = indicators;
        this.loadingComponent = false;
        const first = this.indicators[0];
        if (first) this.selectedIndicator = first;
        this.cd.detectChanges();
      },
      error: () => {
        this.componentAggregate = null;
        this.indicatorsAggregate = null;
        this.loadingComponent = false;
        this.cd.detectChanges();
      }
    });
  }

  onYearChange(year: number): void {
    this.effectiveYear = year;
    this.yearChange.emit(year);

    if (this.selectedComponentId) {
      forkJoin({
        aggregate: this.reportsService.aggregateByComponent(
          this.selectedComponentId, year,
          this.dateFrom ?? undefined,
          this.dateTo ?? undefined
        ),
        indicators: this.reportsService.aggregateIndicatorsByComponent(
          this.selectedComponentId, year,
          this.dateFrom ?? undefined,
          this.dateTo ?? undefined
        )
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ aggregate, indicators }) => {
          const currentId = this.selectedIndicator?.indicator_id ?? null;
          this.componentAggregate = aggregate;
          this.indicatorsAggregate = indicators;
          if (currentId !== null) {
            const same = this.indicators.find(i => i.indicator_id === currentId);
            if (same) this.selectedIndicator = same;
          }
          this.cd.detectChanges();
        }
      });
    }
  }

  onStrategySelect(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    this.selectedComponentId = null;
    this.componentAggregate = null;
    this.selectedIndicator = null;
    this.strategyChange.emit(id);
  }

  onComponentSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    const id = val === '' ? null : Number(val);
    this.selectedComponentId = id;
    this.selectedIndicator = null;
    this.componentAggregate = null;
    this.indicatorsAggregate = null;
    if (id === null) { this.cd.detectChanges(); return; }
    this.loadComponentData(id);
  }

  onIndicatorSelect(indicator: IndicatorDetail): void {
    this.selectedIndicator =
      this.selectedIndicator?.indicator_id === indicator.indicator_id
        ? null : indicator;
    this.cd.detectChanges();
  }

  toggleShowAll(): void {
    this.showAllIndicators = !this.showAllIndicators;
    this.cd.detectChanges();
  }
}
import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { COMPONENT_EXPLORER_CONFIG, DEFAULT_EXPLORER_CONFIG } from "../../../../../core/data/component-explorer-config";
import { getIndicatorDisplayName } from "../../../../../core/data/indicator-display-names";
import { AggregateByComponent, ComponentAggregate, ComponentIndicatorsAggregate, IndicatorDetail } from "../../../../../core/models/report-aggregate.model";
import { ReportsService } from "../../../../../core/services/reports.service";
import { BarClickEvent } from "./reports-explorer-chart/chart-builder.service";
import { ReportsExplorerChartComponent } from "./reports-explorer-chart/reports-explorer-chart";


const PILLS_VISIBLE = 6;

@Component({
  selector: 'app-reports-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportsExplorerChartComponent],
  templateUrl: './reports-explorer.html',
})
export class ReportsExplorerComponent implements OnChanges {

  @Input() strategyIds: number[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() selectedStrategyId: number | null = null;
  @Input() components: AggregateByComponent[] = [];

  @Output() strategyChange = new EventEmitter<number>();

  selectedComponentId: number | null = null;
  componentAggregate: ComponentAggregate | null = null;
  selectedIndicator: IndicatorDetail | null = null;
  loadingComponent = false;
  indicatorsAggregate: ComponentIndicatorsAggregate | null = null;
  showAllIndicators = false;
  selectedYear: number = new Date().getFullYear();

  get indicators(): IndicatorDetail[] {
    const config = this.selectedComponentId
      ? (COMPONENT_EXPLORER_CONFIG[this.selectedComponentId] ?? DEFAULT_EXPLORER_CONFIG)
      : DEFAULT_EXPLORER_CONFIG;

    const hidden = new Set(config.hiddenIndicators ?? []);

    const list = (this.indicatorsAggregate?.indicators ?? [])
      .filter(ind => !hidden.has(ind.indicator_id))
      .filter(ind => ind.indicator_id > 0)  // ← excluir virtuales del backend
      .map(ind => ({
        ...ind,
        indicator_name: getIndicatorDisplayName(ind.indicator_id, ind.indicator_name)
      }));

    const byLocation = this.indicatorsAggregate?.by_location ?? [];
    const byLocationIndicator = this.indicatorsAggregate?.by_location_indicator ?? [];
    const virtual: IndicatorDetail[] = [];

    // "Reportes por mes"
    if (config.showReportesPorMes) {
      virtual.push({
        indicator_id: -2,
        indicator_name: config.jornadasPorMesLabel ?? 'Jornadas por mes',
        field_type: 'by_month_reports',
      });
    }
    // Virtuales específicos para Mesa PYBA (component 28)
    if (this.selectedComponentId === 28) {
      const raw = this.indicatorsAggregate?.indicators ?? [];  // ← sin filtrar
      const tipoActor = raw.find(i => i.indicator_id === 129);
      const asistentes = raw.find(i => i.indicator_id === 131);

      if (tipoActor?.by_category?.length) {
        virtual.push({
          indicator_id: -4001,
          indicator_name: 'Tipo de actor / Mesas',
          field_type: 'by_category',
          by_category: tipoActor.by_category,
        });
      }

      if (asistentes?.by_month?.length) {
        virtual.push({
          indicator_id: -4002,
          indicator_name: 'Total asistentes por mes',
          field_type: 'by_month_sum',
          by_month: asistentes.by_month,
        });
      }
    }

    // Dejando huella ID 24
    if (this.selectedComponentId === 24) {
      const raw = this.indicatorsAggregate?.indicators ?? [];
      const byLocationIndicator = this.indicatorsAggregate?.by_location_indicator ?? [];

      const institucion = raw.find(i => i.indicator_id === 116);
      const jovenes = raw.find(i => i.indicator_id === 117);
      const proyectos = raw.find(i => i.indicator_id === 118);

      // 1. Cantidad de jóvenes inscritos / institución educativa
      // Usa by_category del indicador 116 si existe, si no construye desde by_location_indicator
      if (institucion?.by_category?.length) {
        virtual.push({
          indicator_id: -6001,
          indicator_name: 'Cantidad de jóvenes inscritos / institución educativa',
          field_type: 'by_category',
          by_category: institucion.by_category
        });
      }

      // 2. Jóvenes inscritos / municipios
      if (byLocationIndicator.length > 0) {
        const locationDataJovenes = byLocationIndicator
          .map(l => {
            const match = l.indicators.find((i: any) => i.indicator_id === 117);
            return match ? { location: l.location, total: match.total } : null;
          })
          .filter(Boolean) as { location: string; total: number }[];

        if (locationDataJovenes.length > 0) {
          virtual.push({
            indicator_id: -6002,
            indicator_name: 'Jóvenes inscritos / municipios',
            field_type: 'by_location',
            by_location: locationDataJovenes,
          });
        }
      }

      // 3. Proyectos / municipios
      if (byLocationIndicator.length > 0) {
        const locationDataProyectos = byLocationIndicator
          .map(l => {
            const match = l.indicators.find((i: any) => i.indicator_id === 118);
            return match ? { location: l.location, total: match.total } : null;
          })
          .filter(Boolean) as { location: string; total: number }[];

        if (locationDataProyectos.length > 0) {
          virtual.push({
            indicator_id: -6003,
            indicator_name: 'Proyectos / municipios',
            field_type: 'by_location',
            by_location: locationDataProyectos,
          });
        }
      }

    }

    // Virtuales específicos para CBA (component 7)
    if (this.selectedComponentId === 7) {
      const raw = this.indicatorsAggregate?.indicators ?? [];
      const tipoDotacion = raw.find(i => i.indicator_id === 132);

      if (tipoDotacion?.by_category?.length) {
        virtual.push({
          indicator_id: -5001,
          indicator_name: 'Tipo de dotación / Centro de bienestar',
          field_type: 'by_category',
          by_category: tipoDotacion.by_category,
        });
      }

      if (tipoDotacion?.by_month?.length) {
        virtual.push({
          indicator_id: -5002,
          indicator_name: 'Dotación por tiempo',
          field_type: 'by_month_sum',
          by_month: tipoDotacion.by_month,
        });
      }
    }

    // "Temas tratados por municipio" — para Asistencias Técnicas
    if (config.showTemasPorMunicipio && byLocationIndicator.length > 0) {
      const temasTratadosId = 95; // indicador "Temas tratados"
      const temasMeta = list.find(i => i.indicator_id === temasTratadosId);

      if (temasMeta) {
        // Construir datos: por cada municipio, sumar el total del indicador 95
        const locationData = byLocationIndicator
          .map(l => {
            const match = l.indicators.find((i: any) => i.indicator_id === temasTratadosId);
            return match ? { location: l.location, total: match.total } : null;
          })
          .filter(Boolean) as { location: string; total: number }[];

        if (locationData.length > 0) {
          virtual.push({
            indicator_id: -3001,
            indicator_name: 'Temas tratados por municipio',
            field_type: 'by_location',
            by_location: locationData,
          });
        }
      }
    }

    // "Personas asistidas por tiempo" — para Asistencias Técnicas
    if (config.jornadasPorMesLabel) {
      const personasId = 96; // indicador "Personas asistidas"
      const personasMeta = list.find(i => i.indicator_id === personasId);

      if (personasMeta?.by_month?.length) {
        virtual.push({
          indicator_id: -3002,
          indicator_name: config.jornadasPorMesLabel,
          field_type: 'by_month_sum',
          by_month: personasMeta.by_month,
        });
      }
    }

    // "Reportes por municipio"
    if (config.showReportesPorMunicipio && byLocation.length > 0) {
      virtual.push({
        indicator_id: -1,
        indicator_name: config.locationLabel ?? 'Jornadas por municipio',
        field_type: 'by_location',
        by_location: byLocation,
      });
    }

    // "X por municipio"
    if (config.showIndicadoresPorMunicipio && byLocationIndicator.length > 0) {
      const indicatorIds = new Set(
        byLocationIndicator.flatMap(l => l.indicators.map((i: any) => i.indicator_id))
      );

      indicatorIds.forEach(indId => {
        const meta = list.find(i => i.indicator_id === indId);
        if (!meta) return;

        const locationData = byLocationIndicator
          .map(l => {
            const match = l.indicators.find((i: any) => i.indicator_id === indId);
            return match ? { location: l.location, total: match.total } : null;
          })
          .filter(Boolean) as { location: string; total: number }[];

        virtual.push({
          indicator_id: -(indId + 1000),
          indicator_name: meta.indicator_id === 114
            ? 'Cantidad de niños por municipio'
            : `${meta.indicator_name} por municipio`,
          field_type: 'by_location',
          by_location: locationData,
        });
      });
    }

    // "X por mes" — para sum_group y grouped_data que tienen by_month
    list.forEach(ind => {
      if (
        (ind.field_type === 'sum_group' || ind.field_type === 'grouped_data') &&
        ind.by_month && ind.by_month.length > 0
      ) {
        virtual.push({
          indicator_id: -(ind.indicator_id + 2000),
          indicator_name: ind.indicator_id === 114
            ? 'Cantidad de niños por mes'
            : `${ind.indicator_name} por mes`,
          field_type: 'by_month_sum',
          by_month: ind.by_month,
        });
      }
    });

    // Virtuales para categorized_group — subvistas por config
    if (config.subViews) {
      Object.entries(config.subViews).forEach(([indIdStr, keyMap]) => {
        const indId = Number(indIdStr);
        const ind = list.find(i => i.indicator_id === indId);
        if (!ind?.by_nested) return;

        Object.entries(keyMap).forEach(([key, label], i) => {
          if (!ind.by_nested![key]) return;
          virtual.push({
            indicator_id: -(indId + 3000 + i),
            indicator_name: label,
            field_type: 'categorized_subview',
            by_nested: { [key]: ind.by_nested![key] },
            by_month: ind.by_month,
          });
        });
      });
    }

    // Alianzas académicas ID 25
    if (this.selectedComponentId === 25) {
      const raw = this.indicatorsAggregate?.indicators ?? [];
      const byLocationIndicator = this.indicatorsAggregate?.by_location_indicator ?? [];
      const byLocation = this.indicatorsAggregate?.by_location ?? [];

      // 1. Cantidad de foros realizados / municipios (1 reporte = 1 foro)
      if (byLocation.length > 0) {
        virtual.push({
          indicator_id: -8002,
          indicator_name: 'Cantidad de foros realizados / municipios',
          field_type: 'by_location',
          by_location: byLocation,
        });
      }

      // 2. Cantidad de personas / municipios (indicator 121 x municipio)
      const locationPersonas = byLocationIndicator
        .map(l => {
          const match = l.indicators.find((i: any) => i.indicator_id === 121);
          return match ? { location: l.location, total: match.total } : null;
        })
        .filter(Boolean) as { location: string; total: number }[];

      if (locationPersonas.length > 0) {
        virtual.push({
          indicator_id: -8003,
          indicator_name: 'Cantidad de personas / municipios',
          field_type: 'by_location',
          by_location: locationPersonas,
        });
      }

      // 3. Temas tratados / foros (cruce 120×121 — viene del backend)
      const cross = raw.find(i => i.indicator_id === -8001);
      if (cross?.by_category?.length) {
        virtual.push({
          indicator_id: -8001,
          indicator_name: 'Temas tratados / foros',
          field_type: 'by_category',
          by_category: cross.by_category,
        });
      }
    }

    // Experiencias culturales ID 26
    if (this.selectedComponentId === 26) {
      const raw = this.indicatorsAggregate?.indicators ?? [];
      const byLocationIndicator = this.indicatorsAggregate?.by_location_indicator ?? [];

      // 1. Cantidad de experiencias / municipios
      const locationExperiencias = byLocationIndicator
        .map(l => {
          const match = l.indicators.find((i: any) => i.indicator_id === 81);
          return match ? { location: l.location, total: match.total } : null;
        })
        .filter(Boolean) as { location: string; total: number }[];

      if (locationExperiencias.length > 0) {
        virtual.push({
          indicator_id: -7001,
          indicator_name: 'Cantidad de experiencias / municipios',
          field_type: 'by_location',
          by_location: locationExperiencias,
        });
      }

      // 2. Cantidad de personas / experiencia — viene del backend como virtual cross
      const cross = raw.find(i => i.indicator_id === -7002);
      if (cross?.by_category?.length) {
        virtual.push({
          indicator_id: -7002,
          indicator_name: 'Cantidad de personas / experiencia',
          field_type: 'by_category',
          by_category: cross.by_category,
        });
      }
    }

    return [...virtual, ...list];
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

  constructor(
    private reportsService: ReportsService,
    private cd: ChangeDetectorRef,
    private router: Router,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['components']) {
      if (!changes['components'].firstChange) {
        this.selectedComponentId = null;
        this.componentAggregate = null;
        this.selectedIndicator = null;
      }

      if (this.components.length > 0) {
        const firstComponent = this.components[0];
        this.selectedComponentId = firstComponent.component_id;
        this.loadComponentData(firstComponent.component_id);
      }
    }
  }

  onChartBarClick(event: BarClickEvent): void {
    this.router.navigate(['/reports'], {
      queryParams: {
        component: event.componentId,
        label: event.label,
      }
    });
  }

  private loadComponentData(id: number): void {
    this.loadingComponent = true;
    this.showAllIndicators = false;
    this.indicatorsAggregate = null;

    forkJoin({
      aggregate: this.reportsService.aggregateByComponent(id),
      indicators: this.reportsService.aggregateIndicatorsByComponent(id, this.selectedYear)
    }).subscribe({
      next: ({ aggregate, indicators }) => {
        this.componentAggregate = aggregate;
        this.indicatorsAggregate = indicators;
        this.loadingComponent = false;

        const first = this.indicators[0];
        if (first) {
          this.selectedIndicator = first;
        }

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
    this.selectedYear = year;

    if (this.selectedComponentId) {
      this.reportsService
        .aggregateIndicatorsByComponent(this.selectedComponentId, year)
        .subscribe({
          next: (result: ComponentIndicatorsAggregate) => {

            const currentId = this.selectedIndicator?.indicator_id ?? null;

            this.indicatorsAggregate = result;

            if (currentId !== null) {
              const same = this.indicators.find(i => i.indicator_id === currentId);
              if (same) {
                this.selectedIndicator = same;
              }
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

    if (id === null) {
      this.cd.detectChanges();
      return;
    }

    this.loadComponentData(id);
  }

  onIndicatorSelect(indicator: IndicatorDetail): void {
    this.selectedIndicator =
      this.selectedIndicator?.indicator_id === indicator.indicator_id
        ? null
        : indicator;

    this.cd.detectChanges();
  }

  toggleShowAll(): void {
    this.showAllIndicators = !this.showAllIndicators;
    this.cd.detectChanges();
  }
}
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { MenuService, MenuItem } from '../../../core/services/menu.service';
import { ReportsService } from '../../../core/services/reports.service';
import { StrategiesService } from '../../../core/services/strategies.service';

import { ReportModel } from '../../../core/models/report.model';
import {
  StrategyAggregate,
  AggregateByComponent,
} from '../../../core/models/report-aggregate.model';


import { catchError, forkJoin, of } from 'rxjs';
import { ReportsExplorerComponent } from './components/reports-explorer/reports-explorer';
import { ReportsKpiCardsComponent } from './components/reports-kpi-cards/reports-kpi-cards';
import { ReportsMapComponent } from './components/reports-map/reports-map';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReportsKpiCardsComponent,
    ReportsExplorerComponent,
    ReportsMapComponent
  ],
  templateUrl: './home-dashboard.html',
})
export class HomeDashboardComponent implements OnInit {

  private readonly MAP_KPI_COMPONENT_PERSONAS = 22;
  private readonly MAP_KPI_INDICATOR_PERSONAS = 76;
  private readonly MAP_KPI_INDICATOR_NINOS = 163;
  private readonly MAP_KPI_COMPONENT_ASISTENCIAS = 2;
  private readonly MAP_KPI_COMPONENT_JUNTAS = 21;
  private readonly MAP_KPI_INDICATOR_ASISTENCIAS_JUNTAS = 160;
  private readonly MAP_KPI_INDICATOR_DENUNCIAS = 137;
  private readonly MAP_KPI_COMPONENT_EMPRENDEDORES = 14;
  private readonly MAP_KPI_INDICATOR_NINOS_SENSIBILIZADOS = 114;

  // ── Navigation sections ──────────────────────────────────
  roleId: number | null = null;
  sections: DashboardSectionVM[] = [];

  // ── Analytics panel ──────────────────────────────────────
  reports: ReportModel[] = [];
  strategyMap: Record<number, string> = {};
  componentMap: Record<number, string> = {};
  strategyIds: number[] = [];

  strategyAggregate: StrategyAggregate | null = null;
  components: AggregateByComponent[] = [];
  selectedStrategyId: number | null = null;

  loading = true;
  showDashboard = true;

  selectedYear: number = new Date().getFullYear();

  constructor(
    private authService: AuthService,
    private menuService: MenuService,
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private cd: ChangeDetectorRef,
  ) {
    const user = this.authService.getUser();
    this.roleId = user?.role?.id ?? null;
    this.sections = this.buildDashboardSections();
  }

  get reportsForMap(): ReportModel[] {
    return this.reports.filter(r =>
      new Date(r.report_date).getFullYear() === this.selectedYear
    );
  }
  
  ngOnInit(): void {
    this.loadData();
  }

  // =========================================================
  // UI ACTIONS
  // =========================================================
  toggleDashboard(): void {
    this.showDashboard = !this.showDashboard;
  }

  onStrategyChange(strategyId: number): void {
    this.selectedStrategyId = strategyId;
    this.loadAggregate(strategyId);
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.cd.detectChanges();
  }

  // =========================================================
  // DATA LOADING
  // =========================================================
  private loadData(): void {
    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));
        this.strategyIds = strategies
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(s => s.id);
        this.loadReports();
      },
      error: () => {
        this.strategyMap = {};
        this.strategyIds = [];
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }


  private loadReports(): void {
    this.reportsService.getAll().subscribe({
      next: reports => {
        this.reports = reports ?? [];

        const years = [...new Set(this.reports.map(r => new Date(r.report_date).getFullYear()))];
        if (years.length > 0) {
          this.selectedYear = Math.max(...years);
        }

        if (this.reports.length === 0) {
          this.strategyAggregate = null;
          this.components = [];
          this.componentMap = {};
          this.loading = false;
          this.cd.detectChanges();
          return;
        }

        this.selectedStrategyId = this.reports[0].strategy_id;
        const uniqueStrategyIds = [...new Set(this.reports.map(r => r.strategy_id))];

        const requests = uniqueStrategyIds.map(id =>
          this.reportsService.aggregateByStrategy(id).pipe(
            catchError(() => of(this.emptyAggregate(id)))
          )
        );

        forkJoin(requests).subscribe(aggregates => {
          const fullComponentMap: Record<number, string> = {};

          aggregates.forEach((agg, index) => {
            const strategyId = uniqueStrategyIds[index];
            agg.by_component.forEach(c => {
              fullComponentMap[c.component_id] = c.component_name;
            });
            if (strategyId === this.selectedStrategyId) {
              this.strategyAggregate = agg;
              this.components = agg.by_component;
            }
          });

          this.componentMap = fullComponentMap;
          this.loading = false;
          this.cd.detectChanges();
        });
      },
      error: () => {
        this.reports = [];
        this.strategyAggregate = null;
        this.components = [];
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  private loadAggregate(strategyId: number): void {
    this.reportsService.aggregateByStrategy(strategyId).pipe(
      catchError(() => of(this.emptyAggregate(strategyId)))
    ).subscribe(agg => {
      this.strategyAggregate = agg;
      this.components = agg.by_component;
      const newEntries = Object.fromEntries(
        agg.by_component.map(c => [c.component_id, c.component_name])
      );
      this.componentMap = { ...this.componentMap, ...newEntries };
      this.cd.detectChanges();
    });
  }

  private emptyAggregate(strategyId: number): StrategyAggregate {
    return {
      strategy_id: strategyId,
      total_reports: 0,
      by_component: [],
      by_month: [],
      by_zone: { Urbana: 0, Rural: 0 }
    };
  }

  // =========================================================
  // NAVIGATION SECTIONS
  // =========================================================
  private canShow(item: MenuItem): boolean {
    if (item.disabled) return false;
    if (!item.roles) return true;
    if (!this.roleId) return false;
    return item.roles.includes(this.roleId);
  }

  private buildDashboardSections(): DashboardSectionVM[] {
    return this.menuService.getMenu()
      .filter(section => section.label !== 'Dashboard')
      .map(section => {
        if (!section.children) return null;
        const visibleChildren = section.children.filter(c => this.canShow(c));
        if (!visibleChildren.length) return null;

        return {
          title: section.label,
          description: this.getSectionDescription(section.label),
          items: visibleChildren.map(child => ({
            label: child.label,
            route: child.route!,
            description: this.getItemDescription(child.route!)
          }))
        };
      })
      .filter(Boolean) as DashboardSectionVM[];
  }

  private getSectionDescription(label: string): string {
    switch (label) {
      case 'Reportes PYBA': return 'Gestión del cumplimiento de metas e indicadores del plan.';
      case 'Bases de datos': return 'Administración de la estructura y fuentes de información.';
      case 'Planes de acción': return 'Seguimiento y gestión de actividades por componente.';
      default: return '';
    }
  }

  private getItemDescription(route: string): string {
    switch (route) {
      case 'reports': return 'Consultar y registrar avances.';
      case 'reports/strategies': return 'Organizar la estructura estratégica.';
      case 'reports/components': return 'Relacionar componentes e indicadores.';
      case 'datasets': return 'Gestionar fuentes de datos.';
      case 'datasets/tables': return 'Configurar tablas del sistema.';
      case 'action-plans/calendar': return 'Ver y gestionar planes en el calendario.';
      default: return '';
    }
  }

  get availableYears(): number[] {
    const years = new Set(this.reports.map(r => new Date(r.report_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }

}

/* ===================================================== */

interface DashboardSectionVM {
  title: string;
  description: string;
  items: DashboardItemVM[];
}

interface DashboardItemVM {
  label: string;
  route: string;
  description: string;
}
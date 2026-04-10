import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { MenuService, MenuItem } from '../../../core/services/menu.service';
import { ReportsService } from '../../../core/services/reports.service';
import { StrategiesService } from '../../../core/services/strategies.service';
import { ToastService } from '../../../core/services/toast.service';

import { ReportModel } from '../../../core/models/report.model';
import { StrategyAggregate, AggregateByComponent } from '../../../core/models/report-aggregate.model';

import { catchError, forkJoin, of } from 'rxjs';
import { ReportsExplorerComponent } from './components/reports-explorer/reports-explorer';
import { ReportsKpiCardsComponent } from './components/reports-kpi-cards/reports-kpi-cards';
import { ReportsMapComponent } from './components/reports-map/reports-map';
import { StrategyDashboardComponent } from '../../report/strategy/strategy-list/strategy-dashboard/strategy-dashboard';

type RangePreset = 'year' | 'month' | '3months' | '6months' | 'custom';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReportsKpiCardsComponent,
    ReportsExplorerComponent,
    ReportsMapComponent,
    StrategyDashboardComponent,
  ],
  templateUrl: './home-dashboard.html',
})
export class HomeDashboardComponent implements OnInit {

  // ── Navigation sections ──────────────────────────────────
  roleId: number | null = null;
  sections: DashboardSectionVM[] = [];

  // ── Analytics panel ──────────────────────────────────────
  allReports: ReportModel[] = [];     // todos sin filtrar
  reports: ReportModel[] = [];        // filtrados (van a los componentes)
  strategyMap: Record<number, string> = {};
  componentMap: Record<number, string> = {};
  strategyIds: number[] = [];

  strategyAggregate: StrategyAggregate | null = null;
  components: AggregateByComponent[] = [];
  selectedStrategyId: number | null = null;

  loading = true;
  showDashboard = true;
  selectedYear: number = new Date().getFullYear();

  // ── Filtro de rango ──────────────────────────────────────
  selectedPreset: RangePreset = 'year';
  customDateFrom = '';
  customDateTo = '';
  activeDateFrom: string | null = null;
  activeDateTo: string | null = null;

  readonly PRESETS: { key: RangePreset; label: string }[] = [
    { key: 'month', label: 'Mes actual' },
    { key: '3months', label: 'Últimos 3 meses' },
    { key: '6months', label: 'Últimos 6 meses' },
    { key: 'year', label: 'Año actual' },
    { key: 'custom', label: 'Personalizado' },
  ];

  constructor(
    private authService: AuthService,
    private menuService: MenuService,
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private toast: ToastService,
    private cd: ChangeDetectorRef,
  ) {
    const user = this.authService.getUser();
    this.roleId = user?.role?.id ?? null;
    this.sections = this.buildDashboardSections();
  }

  ngOnInit(): void {
    this.loadData();
  }

  // =========================================================
  // FILTRO
  // =========================================================

  private getRangeForPreset(preset: RangePreset): { from: string; to: string } | null {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    switch (preset) {
      case 'month': {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from: fmt(from), to: fmt(to) };
      }
      case '3months': {
        const from = new Date(today);
        from.setMonth(from.getMonth() - 3);
        return { from: fmt(from), to: fmt(today) };
      }
      case '6months': {
        const from = new Date(today);
        from.setMonth(from.getMonth() - 6);
        return { from: fmt(from), to: fmt(today) };
      }
      case 'year':
        return null;
      case 'custom':
        if (this.customDateFrom && this.customDateTo)
          return { from: this.customDateFrom, to: this.customDateTo };
        return null;
    }
  }

  applyPreset(preset: RangePreset): void {
    this.selectedPreset = preset;
    if (preset !== 'custom') this.applyFilter();
  }

  applyCustomRange(): void {
    if (!this.customDateFrom || !this.customDateTo) {
      this.toast.error('Selecciona ambas fechas.');
      return;
    }
    if (this.customDateFrom > this.customDateTo) {
      this.toast.error('La fecha de inicio debe ser anterior al fin.');
      return;
    }
    this.applyFilter();
  }

  private applyFilter(): void {
    const range = this.getRangeForPreset(this.selectedPreset);

    if (range) {
      this.activeDateFrom = range.from;
      this.activeDateTo = range.to;
      this.reports = this.allReports.filter(r => {
        const d = r.report_date.substring(0, 10);
        return d >= range.from && d <= range.to;
      });

      // Actualizar selectedYear al año más reciente del rango
      const yearsInRange = [...new Set(this.reports.map(r =>
        new Date(r.report_date).getFullYear()
      ))];
      if (yearsInRange.length > 0) {
        this.selectedYear = Math.max(...yearsInRange);
      }

    } else {
      // Preset = year
      this.activeDateFrom = null;
      this.activeDateTo = null;
      this.reports = this.allReports.filter(r =>
        new Date(r.report_date).getFullYear() === this.selectedYear
      );
    }

    this.cd.detectChanges();
  }

  get rangeLabel(): string {
    if (this.activeDateFrom && this.activeDateTo)
      return `${this.activeDateFrom} → ${this.activeDateTo}`;
    return `Año ${this.selectedYear}`;
  }

  // =========================================================
  // UI ACTIONS
  // =========================================================

  toggleDashboard(): void { this.showDashboard = !this.showDashboard; }

  onStrategyChange(strategyId: number): void {
    this.selectedStrategyId = strategyId;
    this.loadAggregate(strategyId);
  }

  onYearChange(year: number): void {
    this.selectedYear = year;

    // Si el preset activo es 'year', recalcular los reportes filtrados por ese año
    if (this.selectedPreset === 'year') {
      this.reports = this.allReports.filter(r =>
        new Date(r.report_date).getFullYear() === year
      );
    }
    // Si hay un rango activo (month, 3months, 6months, custom),
    // el año solo afecta la visualización interna de los componentes,
    // no el array de reports — no hacer nada más

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
    this.reportsService.getAllForDashboard().subscribe({
      next: reports => {
        this.allReports = reports ?? [];

        const years = [...new Set(this.allReports.map(r => new Date(r.report_date).getFullYear()))];
        if (years.length > 0) this.selectedYear = Math.max(...years);

        // Aplicar filtro inicial
        this.applyFilter();

        if (this.allReports.length === 0) {
          this.strategyAggregate = null;
          this.components = [];
          this.componentMap = {};
          this.loading = false;
          this.cd.detectChanges();
          return;
        }

        this.selectedStrategyId = this.allReports[0].strategy_id;
        const uniqueStrategyIds = [...new Set(this.allReports.map(r => r.strategy_id))];

        const requests = uniqueStrategyIds.map(id =>
          this.reportsService.aggregateByStrategy(id).pipe(catchError(() => of(this.emptyAggregate(id))))
        );

        forkJoin(requests).subscribe(aggregates => {
          const fullComponentMap: Record<number, string> = {};
          aggregates.forEach((agg, index) => {
            agg.by_component.forEach(c => { fullComponentMap[c.component_id] = c.component_name; });
            if (uniqueStrategyIds[index] === this.selectedStrategyId) {
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
        this.allReports = [];
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
      this.componentMap = {
        ...this.componentMap,
        ...Object.fromEntries(agg.by_component.map(c => [c.component_id, c.component_name]))
      };
      this.cd.detectChanges();
    });
  }

  private emptyAggregate(strategyId: number): StrategyAggregate {
    return { strategy_id: strategyId, total_reports: 0, by_component: [], by_month: [], by_zone: { Urbana: 0, Rural: 0 } };
  }

  onCustomDateFromChange(): void {
    // Si "Hasta" es anterior a "Desde", resetearla
    if (this.customDateTo && this.customDateFrom > this.customDateTo) {
      this.customDateTo = '';
    }
  }

  onCustomDateToChange(): void {
    // Si "Desde" es posterior a "Hasta", resetearla
    if (this.customDateFrom && this.customDateTo < this.customDateFrom) {
      this.customDateFrom = '';
    }
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
    const years = new Set(this.allReports.map(r => new Date(r.report_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }
}

interface DashboardSectionVM { title: string; description: string; items: DashboardItemVM[]; }
interface DashboardItemVM { label: string; route: string; description: string; }
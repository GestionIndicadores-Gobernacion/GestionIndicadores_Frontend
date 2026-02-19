import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ReportModel } from '../../../../core/models/report.model';
import {
  StrategyAggregate, AggregateByMonth,
  ComponentAggregate, AggregateByComponent
} from '../../../../core/models/report-aggregate.model';

import { ReportsService } from '../../../../core/services/reports.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';

import { ReportsKpiCardsComponent } from './components/reports-kpi-cards/reports-kpi-cards';
import { ReportsTableComponent } from './components/reports-table/reports-table';
import { ReportsTimelineComponent } from './components/reports-timeline/reports-timeline';
import { ReportsMapComponent } from './components/reports-map/reports-map';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReportsKpiCardsComponent,
    ReportsTimelineComponent,
    ReportsTableComponent,
    ReportsMapComponent,
  ],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsListComponent implements OnInit {

  reports: ReportModel[] = [];
  strategyMap: Record<number, string> = {};
  /** component_id → component_name, construido al cargar reportes */
  componentMap: Record<number, string> = {};
  strategyIds: number[] = [];

  strategyAggregate: StrategyAggregate | null = null;
  byMonth: AggregateByMonth[] = [];
  components: AggregateByComponent[] = [];
  componentAggregate: ComponentAggregate | null = null;

  selectedStrategyId: number | null = null;
  initialYear: number = new Date().getFullYear();

  showDashboard = true;
  loading = false;

  constructor(
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  toggleDashboard(): void {
    this.showDashboard = !this.showDashboard;
  }

  onStrategyChange(id: number): void {
    this.selectedStrategyId = id;
    this.componentAggregate = null;
    this.loadAggregate(id);
  }

  onComponentChange(componentId: number | null): void {
    if (componentId === null) {
      this.componentAggregate = null;
      return;
    }
    this.reportsService.aggregateByComponent(componentId).subscribe({
      next: agg => { this.componentAggregate = agg; },
      error: () => { this.componentAggregate = null; }
    });
  }

  deleteReport(id: number): void {
    this.toast.confirm('Eliminar reporte', 'Esta acción no se puede deshacer.')
      .then(result => {
        if (!result.isConfirmed) return;
        this.reportsService.delete(id).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r.id !== id);
            this.toast.success('Reporte eliminado correctamente');
            if (this.selectedStrategyId) this.loadAggregate(this.selectedStrategyId);
          },
          error: () => this.toast.error('Error al eliminar el reporte')
        });
      });
  }

  // ═══════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════

  private loadData(): void {
    this.loading = true;
    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));
        this.strategyIds = strategies
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(s => s.id);
        this.loadReports();
      },
      error: () => { this.loading = false; }
    });
  }

  private loadReports(): void {
    this.reportsService.getAll().subscribe({
      next: reports => {
        this.reports = reports;
        this.loading = false;

        const mostRecent = reports[0] ?? null;
        if (mostRecent) {
          this.selectedStrategyId = mostRecent.strategy_id;
          this.initialYear = new Date(mostRecent.report_date).getFullYear();
        }

        // Cargar aggregates de TODAS las estrategias para poblar componentMap completo
        const uniqueStrategyIds = [...new Set(reports.map(r => r.strategy_id))];
        uniqueStrategyIds.forEach(id => {
          this.reportsService.aggregateByStrategy(id).subscribe({
            next: agg => {
              for (const c of agg.by_component) {
                this.componentMap = { ...this.componentMap, [c.component_id]: c.component_name };
              }
              // El aggregate de la estrategia más reciente también llena el timeline
              if (id === this.selectedStrategyId) {
                this.strategyAggregate = agg;
                this.byMonth = agg.by_month;
                this.components = agg.by_component;
              }
            }
          });
        });
      },
      error: () => { this.loading = false; }
    });
  }

  private loadAggregate(strategyId: number): void {
    this.reportsService.aggregateByStrategy(strategyId).subscribe({
      next: agg => {
        this.strategyAggregate = agg;
        this.byMonth = agg.by_month;
        this.components = agg.by_component;
        // Enriquecer componentMap con lo que devuelve el aggregate
        for (const c of agg.by_component) {
          this.componentMap[c.component_id] = c.component_name;
        }
      },
      error: () => {
        this.strategyAggregate = null;
        this.byMonth = [];
        this.components = [];
      }
    });
  }

  // ═══════════════════════════════════════
  // DERIVED METRICS
  // ═══════════════════════════════════════

  get totalReports(): number { return this.reports.length; }

  get reportsThisMonth(): number {
    const now = new Date();
    return this.reports.filter(r => {
      const d = new Date(r.report_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }
}
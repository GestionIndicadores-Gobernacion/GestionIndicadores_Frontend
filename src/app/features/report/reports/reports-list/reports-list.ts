import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ReportModel } from '../../../../core/models/report.model';
import { StrategyAggregate, AggregateByMonth } from '../../../../core/models/report-aggregate.model';

import { ReportsService } from '../../../../core/services/reports.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';

import { ReportsKpiCardsComponent } from './components/reports-kpi-cards/reports-kpi-cards';
import { ReportsTableComponent } from './components/reports-table/reports-table';
import { ReportsTimelineComponent } from './components/reports-timeline/reports-timeline';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReportsKpiCardsComponent,
    ReportsTimelineComponent,
    ReportsTableComponent,
  ],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsListComponent implements OnInit {

  reports: ReportModel[] = [];
  strategyMap: Record<number, string> = {};
  strategyIds: number[] = [];

  strategyAggregate: StrategyAggregate | null = null;
  byMonth: AggregateByMonth[] = [];
  selectedStrategyId: number | null = null;

  // Año del reporte más reciente — se pasa al timeline como punto de entrada
  initialYear: number = new Date().getFullYear();

  showDashboard = true;
  loading = false;

  constructor(
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  toggleDashboard(): void {
    this.showDashboard = !this.showDashboard;
  }

  onStrategyChange(id: number): void {
    this.selectedStrategyId = id;
    this.loadAggregate(id);
  }

  deleteReport(id: number): void {
    this.toast.confirm('Eliminar reporte', 'Esta acción no se puede deshacer.')
      .then(result => {
        if (!result.isConfirmed) return;

        this.reportsService.delete(id).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r.id !== id);
            this.toast.success('Reporte eliminado correctamente');
            if (this.selectedStrategyId) {
              this.loadAggregate(this.selectedStrategyId);
            }
          },
          error: () => this.toast.error('Error al eliminar el reporte')
        });
      });
  }

  // ===============================
  // DATA LOADING
  // ===============================
  private loadData(): void {
    this.loading = true;

    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(
          strategies.map(s => [s.id, s.name])
        );
        // Orden alfabético para consistencia en los tabs
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

        // getAll() viene ordenado por report_date DESC — el primero es el más reciente
        const mostRecent = reports[0] ?? null;

        if (mostRecent) {
          this.selectedStrategyId = mostRecent.strategy_id;
          this.initialYear = new Date(mostRecent.report_date).getFullYear();
          this.loadAggregate(mostRecent.strategy_id);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  private loadAggregate(strategyId: number): void {
    this.reportsService.aggregateByStrategy(strategyId).subscribe({
      next: agg => {
        this.strategyAggregate = agg;
        this.byMonth = agg.by_month;
      },
      error: () => {
        this.strategyAggregate = null;
        this.byMonth = [];
      }
    });
  }

  // ===============================
  // DERIVED METRICS
  // ===============================
  get totalReports(): number {
    return this.reports.length;
  }

  get reportsThisMonth(): number {
    const now = new Date();
    return this.reports.filter(r => {
      const date = new Date(r.report_date);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;
  }

}
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { UsersService } from '../../../../core/services/users.service';
import { ReportsAuditLogComponent } from './components/reports-audit-log/reports-audit-log';

import { catchError, forkJoin, of } from 'rxjs';

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
    ReportsAuditLogComponent
  ],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsListComponent implements OnInit {

  reports: ReportModel[] = [];
  strategyMap: Record<number, string> = {};
  componentMap: Record<number, string> = {};
  strategyIds: number[] = [];

  strategyAggregate: StrategyAggregate | null = null;
  byMonth: AggregateByMonth[] = [];
  components: AggregateByComponent[] = [];
  componentAggregate: ComponentAggregate | null = null;

  selectedStrategyId: number | null = null;
  initialYear: number = new Date().getFullYear();

  loading = true;
  showDashboard = true;

  currentUserId: number | null = null;
  isAdmin = false;

  constructor(
    private reportsService: ReportsService,
    private strategiesService: StrategiesService,
    private usersService: UsersService,
    private toast: ToastService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.usersService.getMe().subscribe(user => {
      this.currentUserId = user.id;
      this.isAdmin = user.role?.name === 'admin';
      this.cd.detectChanges();
    });

    this.loadData();
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
      next: agg => {
        this.componentAggregate = agg;
        this.cd.detectChanges();
      },
      error: () => {
        this.componentAggregate = null;
        this.cd.detectChanges();
      }
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
            this.cd.detectChanges();
          },
          error: () => this.toast.error('Error al eliminar el reporte')
        });
      });
  }

  private loadData(): void {
    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));
        this.strategyIds = strategies.sort((a, b) => a.name.localeCompare(b.name)).map(s => s.id);
        this.loadReports();
      },
      error: () => {
        this.strategyMap = {};
        this.strategyIds = [];
        this.cd.detectChanges();
      }
    });
  }

  private loadReports(): void {
    this.reportsService.getAll().subscribe({
      next: reports => {

        this.reports = reports ?? [];

        if (this.reports.length === 0) {
          this.strategyAggregate = null;
          this.byMonth = [];
          this.components = [];
          this.componentMap = {};
          this.loading = false;
          this.cd.detectChanges();
          return;
        }

        const mostRecent = this.reports[0];
        this.selectedStrategyId = mostRecent.strategy_id;
        this.initialYear = new Date(mostRecent.report_date).getFullYear();

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
              this.byMonth = agg.by_month;
              this.components = agg.by_component;
            }
          });

          this.componentMap = fullComponentMap;

          // 🔥 CLAVE: refresca la vista UNA SOLA VEZ cuando todo terminó
          this.loading = false;
          this.cd.detectChanges();
        });

      },
      error: () => {
        this.reports = [];
        this.strategyAggregate = null;
        this.byMonth = [];
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
      this.byMonth = agg.by_month;
      this.components = agg.by_component;

      const newEntries = Object.fromEntries(
        agg.by_component.map(c => [c.component_id, c.component_name])
      );

      this.componentMap = { ...this.componentMap, ...newEntries };
      this.cd.detectChanges();
    });
  }

  get totalReports(): number { return this.reports.length; }

  get reportsThisMonth(): number {
    const now = new Date();
    return this.reports.filter(r => {
      const d = new Date(r.report_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }
}
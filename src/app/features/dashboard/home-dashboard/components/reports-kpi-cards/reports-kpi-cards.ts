import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subject, takeUntil, filter } from 'rxjs';
import { ReportModel } from '../../../../../core/models/report.model';
import { DashboardCardComponent } from './dashboard-card/dashboard-card';
import { KpiSnapshot, ReportsKpiService } from '../../../../../core/services/reports-kpi.service';

@Component({
  selector: 'app-reports-kpi-cards',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent],
  templateUrl: './reports-kpi-cards.html',
  styleUrl: './reports-kpi-cards.css',
})
export class ReportsKpiCardsComponent implements OnInit, OnChanges, OnDestroy {

  @Input() reports: ReportModel[] = [];
  @Input() selectedYear: number = new Date().getFullYear();

  kpis: KpiSnapshot = this.emptySnapshot();

  private destroy$ = new Subject<void>();

  constructor(
    private kpiService: ReportsKpiService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.kpiService.datasetReady$
      .pipe(filter(ready => ready), takeUntil(this.destroy$))
      .subscribe(() => {
        this.refresh();
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reports'] || changes['selectedYear']) {
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refresh(): void {
    this.kpis = this.kpiService.getSnapshot(this.reports, this.selectedYear);
  }

  private emptySnapshot(): KpiSnapshot {
    return {
      asistenciasTecnicas: 0,
      denunciasReportadas: 0,
      personasCapacitadas: 0,
      ninosSensibilizados: 0,
      animalesEsterilizados: 0,
      refugiosImpactados: 0,
      emprendedoresCofinanciados: 0,
    };
  }

  get lastReportDate(): Date | null {
    if (!this.reports.length) return null;
    return new Date(Math.max(...this.reports.map(r => new Date(r.created_at).getTime())));
  }
}
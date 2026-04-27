import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';

import { DashboardCardComponent } from './dashboard-card/dashboard-card';
import {
  KpiSnapshot,
  ReportsKpiService,
} from '../../../../../features/report/services/reports-kpi.service';
import { PageState, PageStateComponent } from '../../../../../shared/components/page-state/page-state';

@Component({
  selector: 'app-reports-kpi-cards',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, LucideAngularModule, PageStateComponent],
  templateUrl: './reports-kpi-cards.html',
  styleUrl: './reports-kpi-cards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsKpiCardsComponent implements OnInit, OnChanges {

  /**
   * El año a consultar. El componente NO recibe reportes ni calcula
   * localmente: todos los valores vienen del endpoint GET /kpis.
   */
  @Input() selectedYear: number = new Date().getFullYear();
  /** Rango activo del filtro de período (preset != year o custom). */
  @Input() dateFrom: string | null = null;
  @Input() dateTo: string | null = null;

  kpis: KpiSnapshot = this.emptySnapshot();

  loading = false;
  loadError = false;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    return 'content';
  }

  private destroyRef = inject(DestroyRef);

  constructor(
    private kpiService: ReportsKpiService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedYear'] || changes['dateFrom'] || changes['dateTo']) {
      this.refresh();
    }
  }

  refresh(): void {
    this.loading = true;
    this.loadError = false;
    this.kpiService
      .getSnapshotRemote(this.selectedYear, this.dateFrom, this.dateTo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: snapshot => {
          this.kpis = snapshot;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.kpis = this.emptySnapshot();
          this.loadError = true;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
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
}

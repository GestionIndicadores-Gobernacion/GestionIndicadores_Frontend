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

@Component({
  selector: 'app-reports-kpi-cards',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent, LucideAngularModule],
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

  kpis: KpiSnapshot = this.emptySnapshot();

  private destroyRef = inject(DestroyRef);

  constructor(
    private kpiService: ReportsKpiService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedYear']) this.refresh();
  }

  private refresh(): void {
    this.kpiService
      .getSnapshotRemote(this.selectedYear)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: snapshot => {
          this.kpis = snapshot;
          this.cdr.markForCheck();
        },
        error: () => {
          // Sin fallback: si el endpoint falla, se muestran los valores
          // vacíos y el error-interceptor global emite el toast. El
          // auth-interceptor ya maneja 401/expiración de sesión.
          this.kpis = this.emptySnapshot();
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

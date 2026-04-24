import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { StrategyModel } from '../../../../../features/report/models/strategy.model';
import { StrategiesService } from '../../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../../core/services/toast.service';

/**
 * 2024 es un año exclusivo del dashboard de estrategias (tiene metas
 * configuradas allí pero no reportes ni KPIs en los demás componentes).
 * Cuando el usuario elige 2024 localmente se aísla el cambio: no se
 * propaga al padre para evitar que los demás componentes queden en un
 * año sin datos.
 */
const STRATEGY_ONLY_YEAR = 2024;

@Component({
  selector: 'app-strategy-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './strategy-dashboard.html',
})
export class StrategyDashboardComponent implements OnInit, OnChanges {

  @Input() showStrategyButtons = true;
  @Input() dateFrom: string | null = null;
  @Input() dateTo: string | null = null;

  /**
   * Año sincronizado con el dashboard principal. Si el padre cambia el
   * año, este componente se actualiza. Si el usuario lo cambia
   * localmente, emite `yearChange` salvo cuando elige 2024 (ver
   * `STRATEGY_ONLY_YEAR`).
   */
  @Input() selectedYear: number = new Date().getFullYear();

  @Output() yearChange = new EventEmitter<number>();

  strategies: StrategyModel[] = [];
  loading = false;
  availableYears: number[] = [];

  private destroyRef = inject(DestroyRef);

  constructor(
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.buildAvailableYears();
    this.loadDashboard(this.selectedYear);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // El padre cambió el año (o el rango) → recargar con el nuevo valor.
    // Se excluye el firstChange para no duplicar la carga inicial de ngOnInit.
    const yearChanged = changes['selectedYear'] && !changes['selectedYear'].firstChange;
    const rangeChanged = (changes['dateFrom'] || changes['dateTo']) && this.dateFrom && this.dateTo;
    if (yearChanged || rangeChanged) {
      this.loadDashboard(this.selectedYear);
    }
  }

  private buildAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    for (let y = 2024; y <= currentYear; y++) {
      this.availableYears.push(y);
    }
  }

  loadDashboard(year: number): void {
    this.loading = true;
    this.cd.detectChanges();

    this.strategiesService.getDashboard(
      year,
      this.dateFrom ?? undefined,
      this.dateTo ?? undefined,
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (data) => {
        this.strategies = data ?? [];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.toast.error('No se pudo cargar el dashboard');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.loadDashboard(year);
    // Emitir al padre solo si el año NO es exclusivo de estrategias.
    // 2024 se queda aislado aquí para no romper los demás componentes.
    if (year !== STRATEGY_ONLY_YEAR) {
      this.yearChange.emit(year);
    }
  }

  goToEdit(id: number): void {
    this.router.navigate([`/reports/strategies/${id}/edit`]);
  }

  get visibleStrategies(): StrategyModel[] {
    return this.strategies.filter(s => (s.progress?.current_year_goal ?? 0) > 0);
  }

  get hiddenCount(): number {
    return this.strategies.length - this.visibleStrategies.length;
  }

  private getMaxValue(): number {
    return Math.max(
      ...this.visibleStrategies.map(x => Math.max(
        x.progress?.current_year_actual ?? 0,
        x.progress?.current_year_goal ?? 0
      )), 1
    );
  }

  getBarPercent(s: StrategyModel): number {
    return Math.min(((s.progress?.current_year_actual ?? 0) / this.getMaxValue()) * 100, 100);
  }

  getGoalPercent(s: StrategyModel): number {
    return Math.min(((s.progress?.current_year_goal ?? 0) / this.getMaxValue()) * 100, 100);
  }

  getPercent(s: StrategyModel): number { return s.progress?.percent ?? 0; }
  getProgressColor(p: number): string { return p >= 80 ? '#15803d' : p >= 50 ? '#b45309' : '#b91c1c'; }
  getProgressBg(p: number): string { return p >= 80 ? '#dcfce7' : p >= 50 ? '#fef3c7' : '#fee2e2'; }
  getProgressTextColor(p: number): string { return p >= 80 ? '#166534' : p >= 50 ? '#92400e' : '#991b1b'; }
  getProgressBarColor(p: number): string {
    return p >= 80 ? 'linear-gradient(90deg,#16a34a,#22c55e)'
      : p >= 50 ? 'linear-gradient(90deg,#d97706,#f59e0b)'
        : 'linear-gradient(90deg,#dc2626,#ef4444)';
  }
  getStatusLabel(p: number): string {
    if (p >= 80) return 'En meta';
    if (p >= 50) return 'En progreso';
    if (p > 0) return 'Por debajo';
    return 'Sin datos';
  }
  getVisibleMetrics(s: StrategyModel): any[] {
    return s.metrics.filter(m => m.year === this.selectedYear || m.year === null || m.year === undefined);
  }
}
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { StrategyModel } from '../../../../../core/models/strategy.model';

@Component({
  selector: 'app-strategy-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './strategy-dashboard.html',
})
export class StrategyDashboardComponent implements OnChanges {

  @Input() strategies: StrategyModel[] = [];
  @Input() loading = false;
  @Input() selectedYear: number = new Date().getFullYear();

  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  get visibleStrategies(): StrategyModel[] {
    return this.strategies.filter(s => (s.progress?.current_year_goal ?? 0) > 0);
  }

  get hiddenCount(): number {
    return this.strategies.length - this.visibleStrategies.length;
  }

  ngOnChanges(changes: SimpleChanges): void { }

  private getMaxValue(): number {
    return Math.max(
      ...this.visibleStrategies.map(x => Math.max(
        x.progress?.current_year_actual ?? 0,
        x.progress?.current_year_goal ?? 0
      )),
      1
    );
  }

  // Devuelve % del ancho relativo al máximo (0-100)
  getBarPercent(s: StrategyModel): number {
    return Math.min(
      ((s.progress?.current_year_actual ?? 0) / this.getMaxValue()) * 100,
      100
    );
  }

  getGoalPercent(s: StrategyModel): number {
    return Math.min(
      ((s.progress?.current_year_goal ?? 0) / this.getMaxValue()) * 100,
      100
    );
  }

  getPercent(s: StrategyModel): number { return s.progress?.percent ?? 0; }

  getProgressColor(percent: number): string {
    if (percent >= 80) return '#15803d';
    if (percent >= 50) return '#b45309';
    return '#b91c1c';
  }

  getProgressBg(percent: number): string {
    if (percent >= 80) return '#dcfce7';
    if (percent >= 50) return '#fef3c7';
    return '#fee2e2';
  }

  getProgressTextColor(percent: number): string {
    if (percent >= 80) return '#166534';
    if (percent >= 50) return '#92400e';
    return '#991b1b';
  }

  getProgressBarColor(percent: number): string {
    if (percent >= 80) return 'linear-gradient(90deg,#16a34a,#22c55e)';
    if (percent >= 50) return 'linear-gradient(90deg,#d97706,#f59e0b)';
    return 'linear-gradient(90deg,#dc2626,#ef4444)';
  }

  getStatusLabel(percent: number): string {
    if (percent >= 80) return 'En meta';
    if (percent >= 50) return 'En progreso';
    if (percent > 0) return 'Por debajo';
    return 'Sin datos';
  }

  getVisibleMetrics(s: StrategyModel): any[] {
    return s.metrics.filter(m =>
      m.year === this.selectedYear || m.year === null || m.year === undefined
    );
  }
}
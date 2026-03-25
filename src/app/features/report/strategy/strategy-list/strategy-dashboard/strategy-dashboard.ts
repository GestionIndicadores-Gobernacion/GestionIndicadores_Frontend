import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StrategyModel } from '../../../../../core/models/strategy.model';

@Component({
  selector: 'app-strategy-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './strategy-dashboard.html',
})
export class StrategyDashboardComponent {

  @Input() strategies: StrategyModel[] = [];
  @Input() loading = false;
  @Input() selectedYear: number = new Date().getFullYear();

  @Output() edit   = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  getPercent(s: StrategyModel): number {
    return s.progress?.percent ?? 0;
  }

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
    if (percent > 0)   return 'Por debajo';
    return 'Sin datos';
  }

  getStatusIcon(percent: number): string {
    if (percent >= 80) return 'M5 13l4 4L19 7';
    if (percent >= 50) return 'M13 10V3L4 14h7v7l9-11h-7z';
    return 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z';
  }
}
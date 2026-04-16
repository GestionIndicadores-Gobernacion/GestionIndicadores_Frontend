import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { StrategyModel } from '../../../../../features/report/models/strategy.model';
import { StrategiesService } from '../../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-strategy-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './strategy-dashboard.html',
})
export class StrategyDashboardComponent implements OnInit {

  @Input() showStrategyButtons = true;
  @Input() dateFrom: string | null = null;   // ← NUEVO: recibe rango desde el padre
  @Input() dateTo: string | null = null;     // ← NUEVO

  strategies: StrategyModel[] = [];
  loading = false;
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

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

  ngOnChanges(): void {
    // Re-cargar cuando el padre cambie el rango
    if (this.dateFrom && this.dateTo) {
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
    ).subscribe({
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
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { StrategiesService } from '../../../../../features/report/services/strategies.service';
import { StrategyModel } from '../../../../../features/report/models/strategy.model';

export interface IndicatorGoal {
  indicator_id: number;
  indicator_name: string;
  goal: number;
  actual: number;
  percent: number;
}

export interface ComponentGoal {
  component_id: number;
  component_name: string;
  strategy_id: number;
  strategy_name: string;
  year: number;
  avg_percent: number;
  indicators: IndicatorGoal[];
}

@Component({
  selector: 'app-compliance-goal-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './compliance-goal-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceGoalDashboardComponent implements OnInit {

  items: ComponentGoal[] = [];
  filteredItems: ComponentGoal[] = [];
  availableYears: number[] = [];
  unconfiguredCount = 0;
  strategies: StrategyModel[] = [];
  loading = true;
  search = '';
  selectedStrategyId: number | null = null;
  selectedYear: number = new Date().getFullYear();
  sortCol: 'name' | 'avg_percent' = 'avg_percent';
  sortDir: 'asc' | 'desc' = 'desc';

  constructor(
    private strategiesService: StrategiesService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.strategiesService.getAll().subscribe({
      next: (s) => { this.strategies = s ?? []; this.cdr.markForCheck(); }
    });
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.strategiesService.getComponentGoals(this.selectedYear, this.selectedStrategyId).subscribe({
      next: (data) => {
        this.availableYears  = data.available_years ?? [];
        this.unconfiguredCount = data.unconfigured_count ?? 0;
        this.items = data.items ?? [];
        // Si el año actual no tiene datos, seleccionar el primero disponible
        if (!this.availableYears.includes(this.selectedYear) && this.availableYears.length > 0) {
          this.selectedYear = this.availableYears[0];
        }
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.items = [];
        this.filteredItems = [];
        this.unconfiguredCount = 0;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onStrategyChange(): void { this.load(); }
  onYearChange(year: number): void { this.selectedYear = year; this.load(); }

  applyFilters(): void {
    const term = this.search.toLowerCase().trim();
    let list = this.items.filter(c =>
      !term ||
      c.component_name.toLowerCase().includes(term) ||
      c.strategy_name.toLowerCase().includes(term) ||
      c.indicators.some(i => i.indicator_name.toLowerCase().includes(term))
    );

    list.sort((a, b) => {
      let va: any, vb: any;
      if (this.sortCol === 'name') {
        va = a.component_name; vb = b.component_name;
      } else {
        va = a.avg_percent; vb = b.avg_percent;
      }
      const cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredItems = list;
  }

  sortBy(col: 'name' | 'avg_percent'): void {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = col === 'name' ? 'asc' : 'desc';
    }
    this.applyFilters();
  }

  progressColor(pct: number): string {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#3b82f6';
    if (pct >= 25) return '#f59e0b';
    return '#ef4444';
  }

  progressBg(pct: number): string {
    if (pct >= 80) return '#D1FAE5';
    if (pct >= 50) return '#DBEAFE';
    if (pct >= 25) return '#FEF3C7';
    return '#FEE2E2';
  }

  get averagePercent(): number {
    if (!this.filteredItems.length) return 0;
    return Math.round(
      this.filteredItems.reduce((s, c) => s + c.avg_percent, 0) / this.filteredItems.length
    );
  }
}

import {
  Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

import {
  AggregateByMonth,
  ComponentAggregate,
  IndicatorDetail,
} from '../../../../../../../core/models/report-aggregate.model';
import { getMetricDisplayName } from '../../../../../../../core/data/indicator-display-names';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-reports-explorer-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './reports-explorer-chart.html',
})
export class ReportsExplorerChartComponent implements OnChanges {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  @Input() componentAggregate: ComponentAggregate | null = null;
  @Input() selectedIndicator: IndicatorDetail | null = null;
  @Input() selectedYear: number = new Date().getFullYear();
  @Input() indicatorDetail: IndicatorDetail | null = null;

  availableYears: number[] = [];
  currentYear: number = this.selectedYear;

  chartType: ChartType = 'bar';
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = this.buildOptions('index');

  constructor(private cd: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['componentAggregate']) {
      this.computeYears();
      this.buildChart();
    }
    if (changes['selectedIndicator'] || changes['indicatorDetail']) {
      this.buildChart();
    }
  }

  selectYear(year: number): void {
    this.currentYear = year;
    this.buildChart();
  }

  get isChartEmpty(): boolean {
    const data = this.chartData.datasets[0]?.data;
    if (!data) return true;
    return (data as number[]).every(v => v === 0);
  }

  get isTemporalChart(): boolean {
    const ft = this.selectedIndicator?.field_type;
    return !ft || ft === 'number' || ft === 'by_month_reports' || ft === 'by_month_sum';
  }

  get indicatorTotal(): number | null {
    const detail = this.indicatorDetail;
    if (!detail) return null;

    switch (detail.field_type) {
      case 'number':
      case 'by_month_sum':
        return detail.by_month?.reduce((s, e) => s + e.total, 0) ?? null;
      case 'by_location':
        return detail.by_location?.reduce((s, e) => s + e.total, 0) ?? null;
      case 'sum_group':
      case 'grouped_data':
      case 'select':
      case 'multi_select':
        return detail.by_category?.reduce((s, e) => s + e.total, 0) ?? null;
      case 'categorized_group':
        if (!detail.by_nested) return null;
        return Object.values(detail.by_nested).flat().reduce((s, e) => s + e.total, 0);
      case 'by_month_reports':
        return this.componentAggregate?.by_month?.reduce((s, e) => s + e.total, 0) ?? null;
      default:
        return null;
    }
  }

  private refresh(): void {
    setTimeout(() => { this.chart?.update(); }, 50);
  }

  private computeYears(): void {
    const source = this.componentAggregate?.by_month ?? [];
    const years = new Set(source.map(e => Number(e.month.split('-')[0])));
    years.add(new Date().getFullYear());
    this.availableYears = Array.from(years).sort((a, b) => b - a);
    if (!this.availableYears.includes(this.currentYear)) {
      this.currentYear = this.availableYears[0];
    }
  }

  private buildChart(): void {
    if (!this.componentAggregate) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }
    if (this.selectedIndicator && this.indicatorDetail) {
      this.buildDetailChart();
    } else {
      this.buildZoneChart();
    }
    this.refresh();
  }

  private buildDetailChart(): void {
    const detail = this.indicatorDetail!;
    switch (detail.field_type) {
      case 'number': this.buildNumberChart(detail); break;
      case 'by_month_sum': this.buildMonthSumChart(detail); break;
      case 'by_month_reports': this.buildZoneChart(); break;
      case 'sum_group':
      case 'grouped_data':
      case 'select':
      case 'multi_select': this.buildCategoryChart(detail); break;
      case 'categorized_group': this.buildNestedChart(detail); break;
      case 'by_location': this.buildLocationChart(detail); break;
      case 'categorized_subview':
        this.buildNestedChart(detail);
        break;
      default: this.buildZoneChart();
    }
  }

  private buildZoneChart(): void {
    const source = this.componentAggregate!.by_month;
    const filtered = source.filter(e => Number(e.month.split('-')[0]) === this.currentYear);
    const grouped: Record<string, AggregateByMonth> = {};
    filtered.forEach(e => { grouped[e.month] = e; });

    const urbana = this.monthArray(i => grouped[this.monthKey(i)]?.urbana ?? 0);
    const rural = this.monthArray(i => grouped[this.monthKey(i)]?.rural ?? 0);

    this.chartType = 'bar';
    this.chartOptions = this.buildOptions('index');
    this.chartData = {
      labels: MONTHS,
      datasets: [
        { data: urbana, label: 'Urbana', backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1, borderRadius: 4 },
        { data: rural, label: 'Rural', backgroundColor: 'rgba(99, 102, 241, 0.7)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1, borderRadius: 4 }
      ]
    };
  }

  private buildNumberChart(detail: IndicatorDetail): void {
    const byMonth = detail.by_month ?? [];
    const filtered = byMonth.filter(e => Number(e.month.split('-')[0]) === this.currentYear);
    const grouped: Record<string, number> = {};
    filtered.forEach(e => { grouped[e.month] = e.total; });
    const data = this.monthArray(i => grouped[this.monthKey(i)] ?? 0);

    this.chartType = 'bar';
    this.chartOptions = this.buildOptions('index');
    this.chartData = {
      labels: MONTHS,
      datasets: [{ data, label: detail.indicator_name, backgroundColor: 'rgba(245, 158, 11, 0.7)', borderColor: 'rgba(245, 158, 11, 1)', borderWidth: 1, borderRadius: 4 }]
    };
  }

  private buildMonthSumChart(detail: IndicatorDetail): void {
    const byMonth = detail.by_month ?? [];
    const filtered = byMonth.filter(e => Number(e.month.split('-')[0]) === this.currentYear);
    const grouped: Record<string, number> = {};
    filtered.forEach(e => { grouped[e.month] = e.total; });
    const data = this.monthArray(i => grouped[this.monthKey(i)] ?? 0);

    this.chartType = 'bar';
    this.chartOptions = this.buildOptions('index');
    this.chartData = {
      labels: MONTHS,
      datasets: [{ data, label: detail.indicator_name, backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1, borderRadius: 4 }]
    };
  }

  private buildCategoryChart(detail: IndicatorDetail): void {
    const byCategory = detail.by_category ?? [];
    this.chartType = 'bar';
    this.chartOptions = this.buildOptions('y', true);
    this.chartData = {
      labels: byCategory.map(c => c.category),
      datasets: [{ data: byCategory.map(c => c.total), label: detail.indicator_name, backgroundColor: 'rgba(99, 102, 241, 0.7)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1, borderRadius: 4 }]
    };
  }

  private buildLocationChart(detail: IndicatorDetail): void {
    const byLocation = (detail.by_location ?? []).filter(l => l.total > 0);
    const isReportCount = detail.indicator_id === -1;
    const color = isReportCount ? 'rgba(99, 102, 241, 0.8)' : 'rgba(245, 158, 11, 0.8)';
    const borderColor = isReportCount ? 'rgba(99, 102, 241, 1)' : 'rgba(245, 158, 11, 1)';

    this.chartType = 'bar';
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      animation: { duration: 400 },
      interaction: { mode: 'y', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${(ctx.parsed.x ?? 0).toLocaleString()}` } }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { ticks: { font: { size: 11 } } }
      }
    };
    this.chartData = {
      labels: byLocation.map(l => l.location),
      datasets: [{ data: byLocation.map(l => l.total), label: detail.indicator_name, backgroundColor: color, borderColor, borderWidth: 0, borderRadius: 6, barThickness: 22 }]
    };
  }

  private buildNestedChart(detail: IndicatorDetail): void {
    const byNested = detail.by_nested ?? {};
    const categories = Object.keys(byNested);
    if (categories.length === 0) return;

    const allMetrics = [...new Set(categories.flatMap(cat => byNested[cat].map(e => e.metric)))];
    const colors = ['rgba(16, 185, 129, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(59, 130, 246, 0.7)'];

    const datasets = allMetrics.map((metric, i) => ({
      label: getMetricDisplayName(metric),  // ← nombre legible
      data: categories.map(cat => byNested[cat].find(e => e.metric === metric)?.total ?? 0),
      backgroundColor: colors[i % colors.length],
      borderWidth: 1,
      borderRadius: 4,
    }));

    this.chartType = 'bar';
    this.chartOptions = this.buildOptions('index');
    this.chartData = { labels: categories, datasets };
  }

  private buildOptions(interactionMode: 'index' | 'y', horizontal = false): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      animation: { duration: 400 },
      interaction: { mode: interactionMode, intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { beginAtZero: true, ticks: { autoSkip: false, maxRotation: horizontal ? 0 : 45 } },
        y: { beginAtZero: true }
      }
    };
  }

  private monthKey(i: number): string {
    return `${this.currentYear}-${String(i + 1).padStart(2, '0')}`;
  }

  private monthArray(fn: (i: number) => number): number[] {
    return Array.from({ length: 12 }, (_, i) => fn(i));
  }
}
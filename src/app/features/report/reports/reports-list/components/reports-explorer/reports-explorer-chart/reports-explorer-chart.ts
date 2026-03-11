import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  EventEmitter,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

import {
  ComponentAggregate,
  IndicatorDetail
} from '../../../../../../../core/models/report-aggregate.model';

import { getMetricDisplayName } from '../../../../../../../core/data/indicator-display-names';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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
  @Input() indicatorDetail: IndicatorDetail | null = null;
  @Input() selectedYear: number = new Date().getFullYear();

  @Output() yearChange = new EventEmitter<number>();

  availableYears: number[] = [];
  currentYear: number = this.selectedYear;

  chartType: ChartType = 'bar';
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false
    },
    plugins: {
      tooltip: {
        enabled: true
      }
    }
  };

  chartKey = 0;

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['selectedYear']) {
      this.currentYear = changes['selectedYear'].currentValue;
    }

    if (changes['componentAggregate']) {
      this.computeYears();
    }

    this.buildChart();
  }

  selectYear(year: number) {
    this.currentYear = year;
    this.yearChange.emit(year);
    this.buildChart();
  }

  get isChartEmpty(): boolean {
    const d = this.chartData.datasets?.[0]?.data;
    return !d || (d as number[]).every(v => v === 0);
  }

  get indicatorTotal(): number | null {
    const d = this.indicatorDetail;
    if (!d) return null;

    if (d.field_type === 'by_month_reports') {
      return this.componentAggregate?.by_month
        .filter(e => this.getYear(e.month) === this.currentYear)
        .reduce((s, e) => s + ((e as any).total ?? (e.urbana ?? 0) + (e.rural ?? 0)), 0) ?? null;
    }

    // ✅ Para categorized_subview, el total real viene de by_month
    if (d.field_type === 'categorized_subview' && d.by_month?.length) {
      return d.by_month
        .filter(e => this.getYear(e.month) === this.currentYear)
        .reduce((s, e) => s + e.total, 0);
    }

    if (d.by_month?.length) {
      return d.by_month
        .filter(e => this.getYear(e.month) === this.currentYear)
        .reduce((s, e) => s + e.total, 0);
    }

    if (d.by_location?.length) {
      return d.by_location.reduce((s, e) => s + e.total, 0);
    }

    if (d.by_category?.length) {
      return d.by_category.reduce((s, e) => s + e.total, 0);
    }

    if (d.by_nested) {
      return Object.values(d.by_nested).flat().reduce((s, e) => s + e.total, 0);
    }

    return null;
  }

  private buildChart() {

    console.log('🔍 buildChart | field_type:', this.indicatorDetail?.field_type);
    console.log('🔍 indicatorDetail completo:', JSON.stringify(this.indicatorDetail, null, 2));


    if (!this.componentAggregate) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const d = this.indicatorDetail;

    if (!d || d.field_type === 'by_month_reports') {
      this.buildJornadasChart();
      return;
    }

    if (d.by_nested) {
      this.buildDonut(d);
      return;
    }

    if (d.by_location) {
      this.buildLocation(d);
      return;
    }

    if (d.by_category) {
      this.buildCategory(d);
      return;
    }

    if (d.by_month) {
      this.buildMonth(d);
      return;
    }

    this.buildJornadasChart();
  }

  private buildJornadasChart() {

    const src = this.componentAggregate!.by_month
      .filter(e => this.getYear(e.month) === this.currentYear);

    const map: Record<string, number> = {};

    src.forEach(e => {
      const total =
        (e as any).total ??
        ((e as any).urbana ?? 0) +
        ((e as any).rural ?? 0);

      if (total > 0) {
        map[e.month] = total;
      }
    });

    const labels: string[] = [];
    const data: number[] = [];

    MONTHS.forEach((m, i) => {
      const key = this.monthKey(i);
      const value = map[key];
      if (value) {
        labels.push(m);
        data.push(value);
      }
    });

    this.chartType = 'bar';

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'x',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          type: 'category'
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          }
        }
      }
    };

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Jornadas',
          data,
          backgroundColor: 'rgba(16,185,129,0.85)',
          borderRadius: 4,
          barThickness: 32
        }
      ]
    };

    this.update();
  }

  private buildMonth(d: IndicatorDetail) {

    const map: Record<string, number> = {};

    d.by_month!
      .filter(e => this.getYear(e.month) === this.currentYear)
      .forEach(e => map[e.month] = e.total);

    const labels = MONTHS;
    const data = MONTHS.map((_, i) => map[this.monthKey(i)] ?? 0);

    this.chartType = 'bar';

    this.chartOptions = this.baseBarOptions(false, false);

    this.chartData = {
      labels,
      datasets: [{
        label: d.indicator_name,
        data,
        backgroundColor: 'rgba(245,158,11,.85)',
        borderRadius: 4,
        barThickness: 28
      }]
    };

    this.update();
  }

  private buildCategory(d: IndicatorDetail) {

    const c = d.by_category!;

    this.chartType = c.length > 6 ? 'bar' : 'doughnut';

    if (this.chartType === 'doughnut') {
      this.buildDonutFromArray(
        c.map(x => x.category),
        c.map(x => x.total)
      );
      return;
    }

    this.chartOptions = this.baseBarOptions(true, true);

    this.chartData = {
      labels: c.map(x => x.category),
      datasets: [{
        label: d.indicator_name,
        data: c.map(x => x.total),
        backgroundColor: 'rgba(99,102,241,.8)',
        borderRadius: 4
      }]
    };

    this.update();
  }

  private buildLocation(d: IndicatorDetail) {

    const l = d.by_location!.filter(x => x.total > 0);

    this.chartType = 'bar';

    this.chartOptions = this.baseBarOptions(true, true);

    this.chartData = {
      labels: l.map(x => x.location),
      datasets: [{
        label: d.indicator_name,
        data: l.map(x => x.total),
        backgroundColor: 'rgba(99,102,241,.85)',
        borderRadius: 6,
        barThickness: 18
      }]
    };

    this.update();
  }

  private buildDonut(d: IndicatorDetail) {

    const k = Object.keys(d.by_nested!)[0];
    const arr = d.by_nested![k];

    this.buildDonutFromArray(
      arr.map(x => getMetricDisplayName(x.metric)),
      arr.map(x => x.total)
    );
  }

  private buildDonutFromArray(labels: string[], values: number[]) {

    const colors = [
      '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#22c55e'
    ];

    const total = values.reduce((a, b) => a + b, 0);

    this.chartType = 'doughnut';

    this.chartData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => colors[i % colors.length])
      }]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            generateLabels: (chart) => {
              const ds = chart.data.datasets[0];
              return chart.data.labels!.map((l, i) => {
                const v = (ds.data[i] as number) || 0;
                const p = total ? ((v / total) * 100).toFixed(1) : 0;
                return {
                  text: `${l}: ${v.toLocaleString()} (${p}%)`,
                  fillStyle: (ds.backgroundColor as any[])[i],
                  index: i
                };
              });
            }
          }
        }
      }
    };

    this.update();
  }

  private baseBarOptions(showLegend: boolean, horizontal = false): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { display: showLegend },
        tooltip: {
          mode: 'nearest',
          intersect: true,
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset.label ?? '';
              const value = horizontal ? (ctx.parsed.x ?? 0) : (ctx.parsed.y ?? 0);
              return `${label}: ${value.toLocaleString()}`;
            }
          }
        }
      },
      scales: horizontal
        ? {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { type: 'category' }
        }
        : {
          x: { type: 'category' },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
    };
  }
  private computeYears() {

    const src = this.componentAggregate?.by_month ?? [];

    const years = [...new Set(src.map(e => this.getYear(e.month)))];

    years.push(new Date().getFullYear());

    this.availableYears = [...new Set(years)].sort((a, b) => b - a);

    if (!this.availableYears.includes(this.currentYear)) {
      this.currentYear = this.availableYears[0];
    }
  }

  private getYear(m: string) {
    return Number(m.split('-')[0]);
  }

  private monthKey(i: number) {
    return `${this.currentYear}-${String(i + 1).padStart(2, '0')}`;
  }

  private update() {
    this.chartKey++; // force canvas recreation instead of chart.update()
  }

  get chartHeight(): number {
    if (this.chartType === 'doughnut') return 260;
    if (this.chartType === 'bar' && this.chartOptions?.indexAxis === 'y') {
      const count = this.chartData?.labels?.length ?? 0;
      return Math.max(260, count * 36);
    }
    return 260;
  }
}
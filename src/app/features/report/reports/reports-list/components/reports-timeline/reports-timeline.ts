import { Component, Input, SimpleChanges } from '@angular/core';
import { ReportModel } from '../../../../../../core/models/report.model';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartType
} from 'chart.js';

@Component({
  selector: 'app-reports-timeline',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './reports-timeline.html',
  styleUrl: './reports-timeline.css',
})
export class ReportsTimelineComponent {

  @Input() reports: ReportModel[] = [];

  range: number = 12; // default 12 meses
  growthRate: number | null = null;
  chartType: 'line' | 'bar' = 'line';
  currentYear: number = new Date().getFullYear();

  toggleType(): void {
    this.chartType = this.chartType === 'line' ? 'bar' : 'line';
  }

  setRange(months: number): void {
    this.range = months;
    this.buildChart();
  }

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Reportes por Mes',
        fill: true,
        tension: 0.3
      }
    ]
  };

  chartOptions: ChartConfiguration<'line' | 'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800 },
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${ctx.parsed.y} reportes`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reports']) {
      this.buildChart();
    }
  }

  private buildChart(): void {

    if (!this.reports.length) return;

    const grouped: Record<string, number> = {};

    this.reports.forEach(r => {
      const date = new Date(r.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });

    // Crear rango continuo de meses
    const allMonths: string[] = [];

    const minDate = new Date(
      Math.min(...this.reports.map(r => new Date(r.created_at).getTime()))
    );

    const maxDate = new Date(
      Math.max(...this.reports.map(r => new Date(r.created_at).getTime()))
    );

    let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    while (cursor <= maxDate) {
      allMonths.push(`${cursor.getFullYear()}-${cursor.getMonth()}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    let entries = allMonths.map(key => ({
      key,
      count: grouped[key] || 0
    }));

    if (this.range > 0) {
      entries = entries.slice(-this.range);
    }

    const labels = entries.map(e => {
      const [year, month] = e.key.split('-').map(Number);
      return new Date(year, month).toLocaleDateString('es-ES', {
        month: 'short',
        year: 'numeric'
      });
    });

    const values = entries.map(e => e.count);

    // Crecimiento mensual
    if (values.length >= 2) {
      const last = values.at(-1)!;
      const prev = values.at(-2)!;
      this.growthRate = prev === 0 ? 100 : ((last - prev) / prev) * 100;
    }

    // Comparación interanual
    const currentYearData = entries
      .filter(e => Number(e.key.split('-')[0]) === this.currentYear)
      .map(e => e.count);

    const previousYearData = entries
      .filter(e => Number(e.key.split('-')[0]) === this.currentYear - 1)
      .map(e => e.count);

    const movingAverage = values.map((v, i, arr) =>
      i === 0 ? v : (v + arr[i - 1]) / 2
    );

    this.chartData = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Reportes',
          fill: this.chartType === 'line',
          tension: 0.4,
          borderWidth: 2
        },
        {
          data: movingAverage,
          label: 'Promedio móvil',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4
        },
        {
          data: previousYearData.length ? previousYearData : [],
          label: `Año ${this.currentYear - 1}`,
          borderDash: [2, 2],
          fill: false,
          tension: 0.3
        }
      ]
    };
  }

}

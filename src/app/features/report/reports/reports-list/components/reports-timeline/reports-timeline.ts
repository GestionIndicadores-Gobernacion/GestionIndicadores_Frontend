import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AggregateByMonth } from '../../../../../../core/models/report-aggregate.model';

@Component({
  selector: 'app-reports-timeline',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './reports-timeline.html',
  styleUrl: './reports-timeline.css',
})
export class ReportsTimelineComponent implements OnChanges {

  @Input() byMonth: AggregateByMonth[] = [];
  @Input() strategyIds: number[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() selectedStrategyId: number | null = null;
  // Año del reporte más reciente — define el año visible al entrar
  @Input() initialYear: number = new Date().getFullYear();

  @Output() strategyChange = new EventEmitter<number>();

  showChart = true;
  isFullscreen = false;
  selectedYear: number = this.initialYear;
  availableYears: number[] = [];

  private readonly MONTHS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} reportes`
        }
      }
    },
    scales: {
      x: { stacked: true, ticks: { autoSkip: false, maxRotation: 0 } },
      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando llegan nuevos datos de byMonth, recalcular años y graficar
    if (changes['byMonth'] && this.byMonth.length) {
      this.computeAvailableYears();
      this.buildChart();
    }
    // Cuando el padre cambia el año inicial (nueva estrategia seleccionada)
    if (changes['initialYear'] && changes['initialYear'].currentValue) {
      this.selectedYear = changes['initialYear'].currentValue;
      this.computeAvailableYears();
      this.buildChart();
    }
    if (changes['selectedStrategyId']) {
      setTimeout(() => this.scrollToActiveTab(), 50);
    }
  }

  onStrategySelect(id: number): void {
    this.strategyChange.emit(id);
  }

  selectYear(year: number): void {
    this.selectedYear = year;
    this.buildChart();
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      setTimeout(() => {
        setTimeout(() => {
          this.showChart = false;
          setTimeout(() => {
            this.buildChart();
            this.showChart = true;
            this.scrollToActiveTab('modal-tabs');
          }, 0);
        }, 0);
      }, 0);
    }
  }

  private computeAvailableYears(): void {
    const yearsInData = new Set(
      this.byMonth.map(e => Number(e.month.split('-')[0]))
    );
    yearsInData.add(new Date().getFullYear());
    this.availableYears = Array.from(yearsInData).sort((a, b) => b - a);

    // Si el año seleccionado no está disponible, usar el más reciente con datos
    if (!this.availableYears.includes(this.selectedYear)) {
      this.selectedYear = this.availableYears[0];
    }
  }

  private scrollToActiveTab(containerId?: string): void {
    const selector = containerId
      ? `#${containerId} [data-active="true"]`
      : '[data-active="true"]';
    const activeTab = document.querySelector(selector) as HTMLElement;
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  private buildChart(): void {
    const grouped: Record<string, { urbana: number; rural: number }> = {};
    this.byMonth
      .filter(e => Number(e.month.split('-')[0]) === this.selectedYear)
      .forEach(e => {
        grouped[e.month] = { urbana: e.urbana, rural: e.rural };
      });

    const urbanaData = Array.from({ length: 12 }, (_, i) => {
      const key = `${this.selectedYear}-${String(i + 1).padStart(2, '0')}`;
      return grouped[key]?.urbana ?? 0;
    });

    const ruralData = Array.from({ length: 12 }, (_, i) => {
      const key = `${this.selectedYear}-${String(i + 1).padStart(2, '0')}`;
      return grouped[key]?.rural ?? 0;
    });

    this.chartData = {
      labels: this.MONTHS,
      datasets: [
        {
          data: urbanaData,
          label: 'Urbana',
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          data: ruralData,
          label: 'Rural',
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }
}
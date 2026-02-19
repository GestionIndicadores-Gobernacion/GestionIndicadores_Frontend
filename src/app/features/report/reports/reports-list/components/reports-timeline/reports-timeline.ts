import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import {
  AggregateByMonth,
  AggregateByComponent,
  ComponentAggregate,
  IndicatorSummary
} from '../../../../../../core/models/report-aggregate.model';

// Nombre del componente especial que habilita el filtro de tema tratado
// Ajusta este string para que coincida exactamente con el nombre en tu BD
const ASISTENCIAS_TECNICAS = 'Asistencias técnicas';

@Component({
  selector: 'app-reports-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './reports-timeline.html',
  styleUrl: './reports-timeline.css',
})
export class ReportsTimelineComponent implements OnChanges {

  // ─── Inputs originales ──────────────────────────────────────────────────────
  @Input() byMonth: AggregateByMonth[] = [];
  @Input() strategyIds: number[] = [];
  @Input() strategyMap: Record<number, string> = {};
  @Input() selectedStrategyId: number | null = null;
  @Input() initialYear: number = new Date().getFullYear();

  // ─── Nuevos Inputs ──────────────────────────────────────────────────────────
  /** Lista de componentes de la estrategia seleccionada (viene de StrategyAggregate.by_component) */
  @Input() components: AggregateByComponent[] = [];
  /** Datos del componente seleccionado (viene de ComponentAggregate, null = vista general) */
  @Input() componentAggregate: ComponentAggregate | null = null;

  // ─── Outputs ────────────────────────────────────────────────────────────────
  @Output() strategyChange = new EventEmitter<number>();
  /** Emite el component_id seleccionado, o null para "todos" */
  @Output() componentChange = new EventEmitter<number | null>();

  // ─── Estado interno ─────────────────────────────────────────────────────────
  showChart = true;
  isFullscreen = false;
  selectedYear: number = this.initialYear;
  availableYears: number[] = [];

  selectedComponentId: number | null = null;
  selectedTopicId: number | null = null;   // solo para Asistencias Técnicas

  private readonly MONTHS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

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

  // ─── Getters computados ─────────────────────────────────────────────────────

  /** ¿El componente seleccionado es Asistencias Técnicas? */
  get isAsistenciasTecnicas(): boolean {
    if (!this.selectedComponentId) return false;
    const comp = this.components.find(c => c.component_id === this.selectedComponentId);
    return comp?.component_name?.toLowerCase().trim() === ASISTENCIAS_TECNICAS.toLowerCase().trim();
  }

  /** Indicadores (temas tratados) disponibles para Asistencias Técnicas */
  get availableTopics(): IndicatorSummary[] {
    return this.componentAggregate?.indicator_summary ?? [];
  }

  /** Datos de byMonth activos: los del componente si hay uno seleccionado, si no los generales */
  private get activeByMonth(): AggregateByMonth[] {
    return this.componentAggregate ? this.componentAggregate.by_month : this.byMonth;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['byMonth'] && this.byMonth.length) {
      this.computeAvailableYears();
      this.buildChart();
    }
    if (changes['initialYear'] && changes['initialYear'].currentValue) {
      this.selectedYear = changes['initialYear'].currentValue;
      this.computeAvailableYears();
      this.buildChart();
    }
    // Cuando llegan datos del componente seleccionado, reconstruir
    if (changes['componentAggregate']) {
      this.selectedTopicId = null; // resetear tema al cambiar componente
      this.computeAvailableYears();
      this.buildChart();
    }
    // Cuando cambian los componentes disponibles, resetear selección
    if (changes['components'] && !changes['components'].firstChange) {
      this.selectedComponentId = null;
      this.selectedTopicId = null;
    }
    if (changes['selectedStrategyId']) {
      setTimeout(() => this.scrollToActiveTab(), 50);
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  onStrategySelect(id: number): void {
    this.strategyChange.emit(id);
  }

  onComponentSelect(componentId: number | null): void {
    this.selectedComponentId = componentId;
    this.selectedTopicId = null;
    this.componentChange.emit(componentId);
    // Si se deselecciona, buildChart con datos generales
    if (componentId === null) {
      this.computeAvailableYears();
      this.buildChart();
    }
  }

  onTopicSelect(indicatorId: number | null): void {
    this.selectedTopicId = indicatorId;
    this.buildChart();
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

  // ─── Privados ────────────────────────────────────────────────────────────────

  private computeAvailableYears(): void {
    const source = this.activeByMonth;
    const yearsInData = new Set(source.map(e => Number(e.month.split('-')[0])));
    yearsInData.add(new Date().getFullYear());
    this.availableYears = Array.from(yearsInData).sort((a, b) => b - a);
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
    // ── Caso especial: tema tratado dentro de Asistencias Técnicas ──────────
    if (this.isAsistenciasTecnicas && this.selectedTopicId !== null) {
      this.buildTopicChart();
      return;
    }

    // ── Caso general: urbana / rural por mes ────────────────────────────────
    const source = this.activeByMonth;
    const grouped: Record<string, { urbana: number; rural: number }> = {};
    source
      .filter(e => Number(e.month.split('-')[0]) === this.selectedYear)
      .forEach(e => { grouped[e.month] = { urbana: e.urbana, rural: e.rural }; });

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

  /**
   * Gráfica para un tema tratado específico dentro de Asistencias Técnicas.
   * Como indicator_summary no tiene desglose mensual, mostramos el total
   * del indicador en la barra del mes correspondiente usando by_month como base
   * de distribución proporcional, o simplemente mostramos el total acumulado
   * como una barra única con la etiqueta del indicador.
   *
   * Si tu backend devuelve desglose mensual por indicador en el futuro,
   * reemplaza esta lógica fácilmente aquí.
   */
  private buildTopicChart(): void {
    const topic = this.availableTopics.find(t => t.indicator_id === this.selectedTopicId);
    if (!topic) return;

    // Distribuimos el total del indicador proporcionalmente según by_month
    const source = this.activeByMonth.filter(
      e => Number(e.month.split('-')[0]) === this.selectedYear
    );
    const totalZone = source.reduce((s, e) => s + e.urbana + e.rural, 0);

    const topicData = Array.from({ length: 12 }, (_, i) => {
      const key = `${this.selectedYear}-${String(i + 1).padStart(2, '0')}`;
      const month = source.find(e => e.month === key);
      if (!month || totalZone === 0) return 0;
      const proportion = (month.urbana + month.rural) / totalZone;
      return Math.round(topic.total * proportion);
    });

    this.chartData = {
      labels: this.MONTHS,
      datasets: [
        {
          data: topicData,
          label: topic.indicator_name,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    };
  }
}
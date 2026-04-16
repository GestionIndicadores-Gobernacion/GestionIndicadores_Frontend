import {
  Component, Input, OnChanges, SimpleChanges,
  ViewChild, EventEmitter, Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Router } from '@angular/router';

import { BarClickEvent, ChartBuildersService } from './chart-builder.service';
import { ComponentAggregate, IndicatorDetail } from '../../../../../../features/report/models/report-aggregate.model';
import { ReportModel } from '../../../../../../features/report/models/report.model';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-reports-explorer-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule, LucideAngularModule],
  templateUrl: './reports-explorer-chart.html',
})
export class ReportsExplorerChartComponent implements OnChanges {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  @Input() componentAggregate: ComponentAggregate | null = null;
  @Input() selectedIndicator: IndicatorDetail | null = null;
  @Input() indicatorDetail: IndicatorDetail | null = null;
  @Input() selectedYear: number = new Date().getFullYear();
  @Input() componentId: number | null = null;
  @Input() allReports: ReportModel[] = [];

  @Output() yearChange = new EventEmitter<number>();
  @Output() barClick = new EventEmitter<BarClickEvent>();

  availableYears: number[] = [];
  currentYear: number = this.selectedYear;

  chartType: ChartType = 'bar';
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {};
  chartKey = 0;

  constructor(
    private builders: ChartBuildersService,
    private router: Router,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedYear']) this.currentYear = changes['selectedYear'].currentValue;
    if (changes['componentAggregate']) this.computeYears();
    this.buildChart();
  }

  selectYear(year: number) {
    this.currentYear = year;
    this.yearChange.emit(year);
    this.buildChart();
  }

  get isChartEmpty(): boolean {
    if (!this.yearHasData) return true;
    const d = this.chartData.datasets?.[0]?.data;
    return !d || (d as number[]).every(v => v === 0);
  }

  get indicatorTotal(): number | null {
    const data = this.chartData?.datasets?.[0]?.data as number[] | undefined;
    if (!data || !data.length) return null;

    return data.reduce((sum, v) => sum + Number(v || 0), 0);
  }

  get chartHeight(): number {
    if (this.chartType === 'doughnut') return 260;
    if (this.chartType === 'bar' && this.chartOptions?.indexAxis === 'y') {
      return Math.max(260, (this.chartData?.labels?.length ?? 0) * 36);
    }
    return 260;
  }

  private buildChart(): void {
    if (!this.componentAggregate) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const result = this.builders.buildForIndicator(
      this.indicatorDetail,
      this.componentAggregate,
      this.currentYear,
      (e) => this.handleBarClick(e),
      this.componentId,
    );

    this.chartType = result.type;
    this.chartData = result.data;
    this.chartOptions = result.options;
    this.chartKey++;
  }

  get yearHasData(): boolean {
    return (this.componentAggregate?.by_month ?? [])
      .some(e => Number(e.month.split('-')[0]) === this.currentYear);
  }


  private handleBarClick(event: BarClickEvent): void {
    this.barClick.emit(event);
  }

  private computeYears(): void {
    // Años del componente actual (para saber cuáles tienen datos)
    const fromAggregate = [...new Set(
      (this.componentAggregate?.by_month ?? []).map(e => Number(e.month.split('-')[0]))
    )];

    // Años de todos los reportes (para mostrar el selector completo)
    const fromAll = [...new Set(
      this.allReports.map(r => new Date(r.report_date).getFullYear())
    )];

    // Unión de ambos, ordenados descendente
    this.availableYears = [...new Set([...fromAggregate, ...fromAll, new Date().getFullYear()])]
      .sort((a, b) => b - a);

    if (!this.availableYears.includes(this.currentYear)) {
      this.currentYear = this.availableYears[0];
    }
  }
}
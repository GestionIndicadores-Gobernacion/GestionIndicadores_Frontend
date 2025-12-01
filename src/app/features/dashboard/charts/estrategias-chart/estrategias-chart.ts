import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { ApexNonAxisChartSeries, NgxApexchartsModule } from 'ngx-apexcharts';

export interface EstrategiaChartData {
  estrategia: string;
  total: number;
}

@Component({
  selector: 'app-estrategias-chart',
  standalone: true,
  imports: [
    CommonModule, NgxApexchartsModule
  ],
  templateUrl: './estrategias-chart.html',
  styleUrl: './estrategias-chart.css',
})

export class EstrategiasChartComponent implements OnChanges {
  @Input() data: EstrategiaChartData[] = [];

  chartSeries: ApexNonAxisChartSeries = [];
  chartLabels: string[] = [];
  chartOptions: any;

  ngOnChanges(): void {
    if (!this.data) return;

    this.chartSeries = this.data.map(e => e.total);
    this.chartLabels = this.data.map(e => e.estrategia);

    this.chartOptions = {
      chart: {
        type: 'pie',
        height: 330
      },
      labels: this.chartLabels,
      title: {
        text: 'Registros por Estrategia'
      },
      legend: {
        position: 'bottom'
      }
    };
  }
}

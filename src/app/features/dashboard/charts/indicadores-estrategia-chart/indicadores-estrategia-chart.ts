import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgxApexchartsModule } from 'ngx-apexcharts';

@Component({
  selector: 'app-indicadores-estrategia-chart',
  standalone: true,
  imports: [
    CommonModule,
    NgxApexchartsModule
  ],
  templateUrl: './indicadores-estrategia-chart.html',
  styleUrl: './indicadores-estrategia-chart.css',
})
export class IndicadoresEstrategiaChartComponent {
  @Input() data: any[] = [];

  chartOptions: any = {
    series: [],
    chart: { type: 'bar', height: 330 },
    xaxis: { categories: [] },
    colors: ['#8e44ad'],
    title: { text: 'Indicadores por Estrategia' }
  };

  ngOnChanges() {
    if (!this.data || this.data.length === 0) return;

    this.chartOptions = {
      series: [{
        name: 'Indicadores distintos',
        data: this.data.map(item => item.total_indicadores),
      }],
      chart: { type: 'bar', height: 330 },
      xaxis: {
        categories: this.data.map(item => item.estrategia),
        labels: { rotate: -35 }
      },
      colors: ['#8e44ad'],
      title: { text: 'Indicadores distintos por Estrategia' }
    };
  }
}

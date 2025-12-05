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
    chart: { type: 'bar', height: 380 },
    xaxis: { categories: [] }
  };

  ngOnChanges() {
    if (!this.data || this.data.length === 0) return;

    this.chartOptions = {
      series: [{
        name: 'Indicadores distintos',
        data: this.data.map(item => item.total_indicadores),
      }],
      chart: { type: 'bar', height: 380 },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          borderRadius: 6,
          dataLabels: {
            position: 'right'
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontWeight: 'bold'
        }
      },
      xaxis: {
        categories: this.data.map(item => item.estrategia),
      },
      colors: [
        '#8e44ad',
        '#2ecc71',
        '#3498db',
        '#e67e22',
        '#e74c3c',
        '#1abc9c',
        '#f1c40f',
        '#9b59b6'
      ],
      title: {
        text: 'Indicadores distintos por Estrategia'
      }
    };

  }
}

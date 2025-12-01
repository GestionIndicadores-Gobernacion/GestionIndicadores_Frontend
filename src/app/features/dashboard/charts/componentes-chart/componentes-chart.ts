import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, NgxApexchartsModule } from 'ngx-apexcharts';

@Component({
  selector: 'app-componentes-chart',
  standalone: true,
  imports: [
    CommonModule, NgxApexchartsModule
  ],
  templateUrl: './componentes-chart.html',
  styleUrl: './componentes-chart.css',
})
export class ComponentesChartComponent implements OnChanges {

  @Input() data: { component_id: number, total: number }[] = [];
  @Input() componentMap: Record<number, string> = {};

  chartSeries: ApexAxisChartSeries = [];
  chartOptions: {
    chart: ApexChart,
    xaxis: ApexXAxis,
    title: ApexTitleSubtitle
  } = {
      chart: { type: 'bar', height: 300 },
      xaxis: { categories: [] },
      title: { text: 'Registros por componente' },
    };

  ngOnChanges(changes: SimpleChanges): void {
    if (this.data) {
      this.chartSeries = [
        {
          name: 'Registros',
          data: this.data.map(d => d.total)
        }
      ];

      this.chartOptions.xaxis = {
        categories: this.data.map(d => this.componentMap[d.component_id] || '—')
      };
    }
  }
}

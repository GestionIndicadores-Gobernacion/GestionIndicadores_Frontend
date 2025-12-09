import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { NgxApexchartsModule } from 'ngx-apexcharts';

@Component({
  selector: 'app-indicadores-mensuales-chart',
  imports: [
    CommonModule,
    NgxApexchartsModule
  ],
  templateUrl: './indicadores-mensuales-chart.html',
  styleUrl: './indicadores-mensuales-chart.css',
})
export class IndicadoresMensualesChartComponent implements OnChanges {
  @Input() indicadores: any[] = [];

  chartOptions: any;

  meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  ngOnChanges(): void {
    if (!this.indicadores || this.indicadores.length === 0) return;

    this.buildChart();
  }

  buildChart() {

    const series = this.indicadores.map(ind => ({
      name: ind.indicador,
      data: this.meses.map((m, i) => {

        // Buscar el mes según "2025-12"
        const mesObj = ind.meses?.find((xx: { mes: string; }) => {
          if (!xx.mes) return false;

          const numeroMes = parseInt(xx.mes.split('-')[1]); // "2025-12" → 12
          return numeroMes === (i + 1);
        });

        return mesObj ? mesObj.valor : 0;
      })
    }));

    this.chartOptions = {
      series,
      chart: {
        height: 380,
        type: 'line',
        toolbar: {
          show: true,
          tools: {
            download: true,      // Descargar PNG
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        zoom: {
          enabled: true,
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 700
        }
      },

      // 🎨 Colores institucionales
      colors: [
        "#1E90FF", // azul institucional
        "#2ECC71", // verde institucional
        "#F39C12", // naranja
        "#9B59B6", // morado
      ],

      stroke: {
        width: 3,
        curve: 'smooth'
      },

      markers: {
        size: 4,
        strokeWidth: 2,
        hover: { size: 7 },
      },

      dataLabels: {
        enabled: true,
        formatter: (val: number) => val > 0 ? val : ""
      },

      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        followCursor: true,
        y: {
          formatter: (val: number) => `${val} unidades`
        }
      },

      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4,
      },

      xaxis: {
        categories: this.meses,
        labels: { style: { fontSize: '13px' } }
      },

      yaxis: {
        title: { text: "Valor mensual" },
        labels: { style: { fontSize: '13px' } }
      },

      legend: {
        position: 'top',
        fontSize: '14px',
        markers: { size: 10 }
      },

      // 📌 Anotación del mes actual
      annotations: {
        xaxis: [
          {
            x: new Date().getMonth(), // 0–11
            borderColor: '#FF4560',
            label: {
              text: 'Mes actual',
              style: {
                color: '#fff',
                background: '#FF4560'
              }
            }
          }
        ]
      },

      noData: {
        text: "No hay datos disponibles",
        align: "center",
        verticalAlign: "middle",
        style: { fontSize: "16px" }
      }
    };

  }

}

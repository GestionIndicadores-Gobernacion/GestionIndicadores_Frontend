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
      data: this.meses.map((_, i) => {

        const mesObj = ind.meses?.find((m: any) => {
          const n = parseInt(m.mes?.split('-')[1]);
          return n === (i + 1);
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
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        zoom: { enabled: true }
      },

      colors: [
        "#1E90FF",
        "#2ECC71",
        "#F39C12",
        "#9B59B6"
      ],

      stroke: {
        width: 3,
        curve: 'smooth'
      },

      markers: {
        size: 4,
        strokeWidth: 2,
        hover: { size: 7 }
      },

      dataLabels: {
        enabled: true,
        formatter: (val: number) => val > 0 ? val : ''
      },

      tooltip: {
        enabled: true,
        shared: false,
        intersect: false,
        followCursor: true,

        custom: ({ seriesIndex, dataPointIndex }: any) => {

          const indicador = this.indicadores[seriesIndex];
          if (!indicador) return '';

          const mesNumero = dataPointIndex + 1;
          const mesNombre = this.meses[dataPointIndex];

          const mesData = indicador.meses?.find((m: any) => {
            const n = parseInt(m.mes?.split('-')[1]);
            return n === mesNumero;
          });

          if (!mesData) return '';

          const municipiosHtml = indicador.municipios?.length
            ? indicador.municipios
                .map((m: any) =>
                  `<div style="font-size:12px">• ${m.municipio}: <b>${m.valor}</b></div>`
                )
                .join('')
            : `<div style="font-size:12px">Sin municipios</div>`;

          return `
            <div style="padding:10px">
              <strong>${indicador.indicador}</strong><br/>
              <span>${mesNombre}: <b>${mesData.valor}</b></span>
              <hr style="margin:6px 0"/>
              <div><strong>Municipios</strong></div>
              ${municipiosHtml}
            </div>
          `;
        }
      },

      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 4
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

      annotations: {
        xaxis: [
          {
            x: new Date().getMonth(),
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

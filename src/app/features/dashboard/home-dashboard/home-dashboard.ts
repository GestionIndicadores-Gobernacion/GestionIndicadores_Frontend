import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { DashboardService } from '../../../core/services/dashboard.service';

import {
  NgxApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexNonAxisChartSeries,
  ApexLegend,
  ApexTitleSubtitle,
} from 'ngx-apexcharts';

// ------------------------------
// TYPES
// ------------------------------

export type KpiKey =
  'totalRegistros' |
  'registrosMes' |
  'municipiosActivos' |
  'indicadoresActivos' |
  'componentesActivos';

export type KpiCardConfig = {
  label: string;
  key: KpiKey;
  colorClass: string;
};

// Chart types with NON-OPTIONAL fields
export type AxisChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  title: ApexTitleSubtitle;
};

// ------------------------------
// COMPONENT
// ------------------------------

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, NgxApexchartsModule],
  templateUrl: './home-dashboard.html',
  styleUrls: ['./home-dashboard.css'],
})
export class HomeDashboardComponent implements OnInit {

  // ---------------- KPIs ----------------

  kpis: Record<KpiKey, number> = {
    totalRegistros: 0,
    registrosMes: 0,
    municipiosActivos: 0,
    indicadoresActivos: 0,
    componentesActivos: 0,
  };

  kpiCards: KpiCardConfig[] = [
    { label: 'Total Registros', key: 'totalRegistros', colorClass: 'kpi-blue' },
    { label: 'Registros del Mes', key: 'registrosMes', colorClass: 'kpi-green' },
    { label: 'Municipios Activos', key: 'municipiosActivos', colorClass: 'kpi-orange' },
    { label: 'Indicadores Activos', key: 'indicadoresActivos', colorClass: 'kpi-purple' },
    { label: 'Componentes Activos', key: 'componentesActivos', colorClass: 'kpi-red' },
  ];

  // ---------------- CHARTS (with defaults) ----------------

  municipiosChart: AxisChartOptions = {
    series: [],
    chart: { type: 'bar', height: 300 },
    xaxis: { categories: [] },
    stroke: { curve: 'smooth' },
    title: { text: '' }
  };

  mesesChart: AxisChartOptions = {
    series: [],
    chart: { type: 'line', height: 300 },
    xaxis: { categories: [] },
    stroke: { curve: 'smooth' },
    title: { text: '' }
  };

  tiposChart: DonutChartOptions = {
    series: [],
    chart: { type: 'donut', height: 300 },
    labels: [],
    legend: { position: 'bottom' },
    title: { text: '' }
  };

  // ---------------- LISTA DE ÚLTIMOS REGISTROS ----------------
  latestRecords: any[] = [];
  loading = true;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadKPIs();
    this.loadStats();
  }

  // ---------------- LOADERS ----------------

  private loadKPIs(): void {
    this.dashboardService.getKPIs().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
      },
      error: (err) => {
        console.error('Error cargando KPIs:', err);
      }
    });
  }

  private loadStats(): void {
    this.loading = true;

    forkJoin({
      municipios: this.dashboardService.getRecordsByMunicipio(),
      meses: this.dashboardService.getRecordsByMes(),
      tipos: this.dashboardService.getRecordsByTipoPoblacion(),
      latest: this.dashboardService.getLatestRecords(5),
    }).subscribe({
      next: ({ municipios, meses, tipos, latest }) => {

        // 6️⃣ Municipios
        this.municipiosChart = {
          series: [{ name: 'Registros', data: municipios.map(m => m.total) }],
          chart: { type: 'bar', height: 300 },
          xaxis: { categories: municipios.map(m => m.municipio) },
          stroke: { curve: 'smooth' },
          title: { text: 'Registros por municipio' }
        };

        // 7️⃣ Meses
        this.mesesChart = {
          series: [{ name: 'Registros', data: meses.map(m => m.total) }],
          chart: { type: 'line', height: 300 },
          xaxis: { categories: meses.map(m => m.mes) },
          stroke: { curve: 'smooth' },
          title: { text: 'Registros por mes' }
        };

        // 8️⃣ Tipos de población
        this.tiposChart = {
          series: tipos.map(t => t.total),
          chart: { type: 'donut', height: 300 },
          labels: tipos.map(t => t.tipo),
          legend: { position: 'bottom' },
          title: { text: 'Tipos de población' }
        };

        // 9️⃣ Últimos registros
        this.latestRecords = latest;

        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas:', err);
        this.loading = false;
      }
    });
  }
}

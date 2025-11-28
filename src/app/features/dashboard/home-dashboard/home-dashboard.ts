import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { DashboardService } from '../../../core/services/dashboard.service';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';

import {
  NgxApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexTitleSubtitle
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

export type AxisChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
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

  // ---------------- MAPAS ----------------
  componentMap: Record<number, string> = {};
  indicatorMap: Record<number, string> = {};

  // ---------------- CHARTS ----------------
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

  // ---------------- LISTA DE ÚLTIMOS REGISTROS ----------------
  latestRecords: any[] = [];
  loading = true;

  constructor(
    private dashboardService: DashboardService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService
  ) { }

  ngOnInit(): void {
    this.loadMaps();
    this.loadKPIs();
    this.loadStats();
  }

  // ---------------- MAPAS ----------------

  private loadMaps(): void {
    forkJoin({
      comps: this.componentsService.getAll(),
      inds: this.indicatorsService.getAll()
    }).subscribe({
      next: ({ comps, inds }) => {

        this.componentMap = Object.fromEntries(
          comps.map(c => [c.id, c.name])
        );

        this.indicatorMap = Object.fromEntries(
          inds.map(i => [i.id, i.name])
        );
      },
      error: (err) => console.error('Error cargando mapas:', err)
    });
  }

  // ---------------- KPIs ----------------

  private loadKPIs(): void {
    this.dashboardService.getKPIs().subscribe({
      next: (kpis) => this.kpis = kpis,
      error: (err) => console.error('Error cargando KPIs:', err)
    });
  }

  // ---------------- GRÁFICOS & ÚLTIMOS REGISTROS ----------------

  private loadStats(): void {
    this.loading = true;

    forkJoin({
      municipios: this.dashboardService.getRecordsByMunicipio(),
      meses: this.dashboardService.getRecordsByMes(),
      latest: this.dashboardService.getLatestRecords(5),
    }).subscribe({
      next: ({ municipios, meses, latest }) => {

        // Municipios
        this.municipiosChart = {
          series: [{ name: 'Registros', data: municipios.map(m => m.total) }],
          chart: { type: 'bar', height: 300 },
          xaxis: { categories: municipios.map(m => m.municipio) },
          stroke: { curve: 'smooth' },
          title: { text: 'Registros por municipio' }
        };

        // Meses
        this.mesesChart = {
          series: [{ name: 'Registros', data: meses.map(m => m.total) }],
          chart: { type: 'line', height: 300 },
          xaxis: { categories: meses.map(m => m.mes) },
          stroke: { curve: 'smooth' },
          title: { text: 'Registros por mes' }
        };

        // Últimos registros
        this.latestRecords = latest;

        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas:', err);
        this.loading = false;
      }
    });
  }

  // Para leer indicadores en detalle_poblacion
  getIndicatorIds(record: any): number[] {
    if (!record.detalle_poblacion) return [];
    return Object.keys(record.detalle_poblacion).map(id => Number(id));
  }

}

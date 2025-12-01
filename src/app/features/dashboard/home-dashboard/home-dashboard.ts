import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { DashboardService } from '../../../core/services/dashboard.service';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';

import { NgxApexchartsModule } from 'ngx-apexcharts';
import { KpiCardsComponent } from '../kpi-cards/kpi-cards';
import { EstrategiasChartComponent } from '../charts/estrategias-chart/estrategias-chart';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgxApexchartsModule,
    KpiCardsComponent,
    EstrategiasChartComponent,
  ],
  templateUrl: './home-dashboard.html',
  styleUrls: ['./home-dashboard.css'],
})
export class HomeDashboardComponent implements OnInit {

  // ---------------- DATA PARA LAS GRÁFICAS ----------------
  estrategiasData: any[] = [];

  municipiosChart: any = {
    series: [],
    chart: { type: 'bar', height: 300 },
    xaxis: { categories: [] },
    stroke: { curve: 'smooth' },
    title: { text: '' }
  };

  mesesChart: any = {
    series: [],
    chart: { type: 'line', height: 300 },
    xaxis: { categories: [] },
    stroke: { curve: 'smooth' },
    title: { text: '' }
  };

  // ---------------- KPIs ----------------
  kpis = {
    totalRegistros: 0,
    registrosMes: 0,
    municipiosActivos: 0,
    indicadoresActivos: 0,
    componentesActivos: 0,
  };

  kpiCards = [
    { label: 'Total Registros', key: 'totalRegistros', colorClass: 'kpi-blue' },
    { label: 'Registros del Mes', key: 'registrosMes', colorClass: 'kpi-green' },
    { label: 'Municipios Activos', key: 'municipiosActivos', colorClass: 'kpi-orange' },
    { label: 'Indicadores Activos', key: 'indicadoresActivos', colorClass: 'kpi-purple' },
    { label: 'Componentes Activos', key: 'componentesActivos', colorClass: 'kpi-red' },
  ];

  // ---------------- MAPAS ----------------
  componentMap: Record<number, string> = {};
  indicatorMap: Record<number, string> = {};

  // ---------------- ÚLTIMOS REGISTROS ----------------
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
      inds: this.indicatorsService.getAll(),
    }).subscribe({
      next: ({ comps, inds }) => {
        this.componentMap = Object.fromEntries(comps.map(c => [c.id, c.name]));
        this.indicatorMap = Object.fromEntries(inds.map(i => [i.id, i.name]));
      }
    });
  }

  // ---------------- KPIs ----------------
  private loadKPIs(): void {
    this.dashboardService.getKPIs().subscribe(res => {
      this.kpis = res;
    });
  }

  // ---------------- ESTADÍSTICAS DEL DASHBOARD ----------------
  private loadStats(): void {
    this.loading = true;

    forkJoin({
      estrategias: this.dashboardService.getRecordsByEstrategia(),
      municipios: this.dashboardService.getRecordsByMunicipio(),
      meses: this.dashboardService.getRecordsByMes(),
      latest: this.dashboardService.getLatestRecords(5),
    }).subscribe({
      next: ({ estrategias, municipios, meses, latest }) => {

        // Estrategias
        this.estrategiasData = estrategias;

        // Municipios
        this.municipiosChart = {
          series: [{ name: 'Registros', data: municipios.map(m => m.total) }],
          chart: { type: 'bar', height: 300 },
          xaxis: { categories: municipios.map(m => m.municipio) },
          stroke: { curve: 'smooth' },
          title: { text: 'Registros por municipio' },
        };

        // Meses
        this.mesesChart = {
          series: [{ name: 'Registros', data: meses.map(m => m.total) }],
          chart: { type: 'line', height: 300 },
          xaxis: { categories: meses.map(m => m.mes) },
          stroke: { curve: 'smooth' },
          title: { text: 'Registros por mes' },
        };

        // Últimos registros
        this.latestRecords = latest;

        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  // ---------------- UTIL ----------------
  getIndicatorIds(record: any): number[] {
    if (!record.detalle_poblacion) return [];
    return Object.keys(record.detalle_poblacion).map(id => Number(id));
  }
}

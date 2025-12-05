import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ComponentsService } from '../../../core/services/components.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IndicatorsService } from '../../../core/services/indicators.service';

import { NgxApexchartsModule } from 'ngx-apexcharts';
import { EstrategiasChartComponent } from '../charts/estrategias-chart/estrategias-chart';
import { KpiCardsComponent } from '../kpi-cards/kpi-cards';
import { IndicadoresEstrategiaChartComponent } from '../charts/indicadores-estrategia-chart/indicadores-estrategia-chart';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgxApexchartsModule,
    KpiCardsComponent,
    EstrategiasChartComponent,
    IndicadoresEstrategiaChartComponent
  ],
  templateUrl: './home-dashboard.html',
  styleUrls: ['./home-dashboard.css'],
})
export class HomeDashboardComponent implements OnInit {

  // ---------------- DATA PARA LAS GRÁFICAS ----------------
  estrategiasData: any[] = [];
  indicadoresEstrategiaData: any[] = [];

  // 📌 NUEVA GRÁFICA: Indicadores por Estrategia
  indicadoresEstrategiaChart: any = {
    series: [],
    chart: { type: 'bar', height: 320 },
    xaxis: { categories: [] },
    colors: ['#8e44ad'],
    title: { text: 'Indicadores por Estrategia' }
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
    { label: 'Total Reportes', key: 'totalRegistros', colorClass: 'kpi-blue' },
    { label: 'Registros del Mes', key: 'registrosMes', colorClass: 'kpi-green' },
    { label: 'Municipios Activos', key: 'municipiosActivos', colorClass: 'kpi-orange' },
    { label: 'Indicadores Activos', key: 'indicadoresActivos', colorClass: 'kpi-purple' },
    { label: 'Componentes Activos', key: 'componentesActivos', colorClass: 'kpi-red' },
  ];

  // ---------------- ÚLTIMOS REGISTROS ----------------
  latestRecords: any[] = [];
  loading = true;

  constructor(
    private dashboardService: DashboardService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService
  ) { }

  ngOnInit(): void {
    this.loadKPIs();
    this.loadStats();
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
    indicadoresEstrategia: this.dashboardService.getIndicatorsByEstrategia(),
  }).subscribe({
    next: ({ estrategias, indicadoresEstrategia }) => {

      this.estrategiasData = estrategias;
      this.indicadoresEstrategiaData = indicadoresEstrategia; // ⭐ AQUÍ

      this.loading = false;
    }
  });
}


}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { DashboardService } from '../../../core/services/dashboard.service';

import { KpiCardsComponent } from './kpi-cards/kpi-cards';
import { AvanceIndicadoresSectionComponent } from './avance-indicadores-section/avance-indicadores-section';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardsComponent,
    AvanceIndicadoresSectionComponent
  ],
  templateUrl: './home-dashboard.html',
  styleUrls: ['./home-dashboard.css'],
})
export class HomeDashboardComponent implements OnInit {

  // ---------------- KPIs generales ----------------
  kpis = {
    totalRegistros: 0,
    municipiosActivos: 0,
    indicadoresActivos: 0,
    componentesActivos: 0,
  };

  kpiCards = [
    { label: 'Total Reportes', key: 'totalRegistros', colorClass: 'kpi-blue' },
    { label: 'Municipios Activos', key: 'municipiosActivos', colorClass: 'kpi-green' },
    { label: 'Indicadores Activos', key: 'indicadoresActivos', colorClass: 'kpi-purple' },
    { label: 'Componentes Activos', key: 'componentesActivos', colorClass: 'kpi-orange' },
  ];

  // ---------------- Gráficas ----------------
  estrategiasData: any[] = [];
  indicadoresEstrategiaData: any[] = [];

  loading = true;

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.loadKPIs();
    this.loadStats();
  }

  // ---------------- Cargar KPIs ----------------
  private loadKPIs(): void {
    this.dashboardService.getKPIs().subscribe(res => {
      this.kpis = res;
    });
  }

  // ---------------- Cargar estadísticas ----------------
  private loadStats(): void {
    this.loading = true;

    Promise.all([
      this.dashboardService.getRecordsByEstrategia().toPromise(),
    ]).then(([estrategias]) => {
      this.estrategiasData = estrategias || [];
      this.loading = false;
    });
  }

}

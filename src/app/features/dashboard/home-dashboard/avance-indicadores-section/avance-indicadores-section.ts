import { Component } from '@angular/core';
import { ComponentsService } from '../../../../core/services/components.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { StrategiesService } from '../../../../core/services/strategy.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KpiIndicadoresComponent } from './kpi-indicadores/kpi-indicadores';
import { IndicadoresMensualesChartComponent } from './charts/indicadores-mensuales-chart/indicadores-mensuales-chart';

@Component({
  selector: 'app-avance-indicadores-section',
  imports: [
    CommonModule,
    FormsModule,
    KpiIndicadoresComponent,
    IndicadoresMensualesChartComponent
  ],
  templateUrl: './avance-indicadores-section.html',
  styleUrl: './avance-indicadores-section.css',
})
export class AvanceIndicadoresSectionComponent {

  estrategias: any[] = [];
  componentes: any[] = [];
  years: number[] = [];

  selectedEstrategia: number | null = null;
  selectedComponente: number | null = null;
  selectedYear: number | null = null;

  avanceIndicadoresData: any[] = [];
  loading = false;

  showErrors = false;

  constructor(
    private dashboardService: DashboardService,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService
  ) { }

  ngOnInit(): void {
    this.loadEstrategias();
    this.generateYears();
  }

  generateYears() {
    const current = new Date().getFullYear();
    this.years = [current - 1, current, current + 1];
  }

  loadEstrategias() {
    this.strategiesService.getAll().subscribe(res => {
      this.estrategias = res;
    });
  }

  onEstrategiaChange() {
    this.selectedComponente = null;
    this.avanceIndicadoresData = [];
    this.showErrors = false;

    if (!this.selectedEstrategia) return;

    this.componentsService.getComponentesByEstrategia(this.selectedEstrategia)
      .subscribe(res => {
        this.componentes = res;
      });
  }

  onBuscar() {
    this.showErrors = true;

    if (!this.selectedEstrategia || !this.selectedComponente || !this.selectedYear) {
      this.avanceIndicadoresData = [];
      return;
    }

    this.loadIndicadores();
  }

  loadIndicadores() {
    if (!this.selectedEstrategia || !this.selectedComponente || !this.selectedYear) {
      this.avanceIndicadoresData = [];
      return;
    }

    this.loading = true;

    this.dashboardService.getAvanceIndicadores(
      this.selectedYear,
      this.selectedEstrategia,
      this.selectedComponente
    ).subscribe(res => {

      // ============================
      // 🔥 PROCESAR INDICADORES AQUÍ
      // ============================
      this.avanceIndicadoresData = res.map(ind => {
        const valor_total = ind.meses?.reduce((acc: number, m: any) => acc + (m.valor || 0), 0) || 0;
        const avance_total = ind.meta ? (valor_total / ind.meta) * 100 : 0;

        return {
          ...ind,
          valor_total,
          avance_total
        };
      });

      console.log("Indicadores procesados:", this.avanceIndicadoresData);

      this.loading = false;
    });
  }

}

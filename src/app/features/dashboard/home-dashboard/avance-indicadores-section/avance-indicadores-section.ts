import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DashboardService } from '../../../../core/services/dashboard.service';
import { StrategiesService } from '../../../../core/services/strategy.service';
import { ComponentsService } from '../../../../core/services/components.service';

import { KpiIndicadoresComponent } from './kpi-indicadores/kpi-indicadores';
import { IndicadoresMensualesChartComponent } from './charts/indicadores-mensuales-chart/indicadores-mensuales-chart';

@Component({
  selector: 'app-avance-indicadores-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiIndicadoresComponent,
    IndicadoresMensualesChartComponent
  ],
  templateUrl: './avance-indicadores-section.html',
  styleUrl: './avance-indicadores-section.css',
})
export class AvanceIndicadoresSectionComponent implements OnInit {

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
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService
  ) { }

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    this.loadEstrategias();
    this.loadYears();
  }

  // =========================
  // AÑOS REALES (records)
  // =========================
  loadYears() {
    this.dashboardService.getYears().subscribe({
      next: res => {
        console.log('AÑOS DESDE BACKEND:', res);
        this.years = res;
      },
      error: err => {
        console.error('ERROR YEARS:', err);
      }
    });
  }


  // =========================
  // ESTRATEGIAS CON RECORDS
  // =========================
  loadEstrategias() {
    this.dashboardService.getRecordsByEstrategia().subscribe(stats => {

      const nombresConDatos = stats.map(s => s.estrategia);

      this.strategiesService.getAll().subscribe(all => {
        this.estrategias = all.filter(e =>
          nombresConDatos.includes(e.name)
        );
      });

    });
  }

  // =========================
  // COMPONENTES CON RECORDS
  // =========================
  onEstrategiaChange() {
    this.selectedComponente = null;
    this.componentes = [];
    this.avanceIndicadoresData = [];
    this.showErrors = false;

    if (!this.selectedEstrategia) return;

    this.dashboardService
      .getRecordsByComponent(this.selectedEstrategia)
      .subscribe(stats => {

        console.log('STATS COMPONENTES:', stats);

        const componentesIds = stats.map(c => Number(c.component_id));
        console.log('IDS CON RECORDS:', componentesIds);

        this.componentsService
          .getByActivity(this.selectedEstrategia!)
          .subscribe(all => {

            console.log('COMPONENTES DEL SERVICE:', all);

            this.componentes = all.filter(c =>
              componentesIds.includes(c.id)
            );

            console.log('COMPONENTES FINALES:', this.componentes);
          });

      });
  }

  // =========================
  // BUSCAR
  // =========================
  onBuscar() {
    this.showErrors = true;

    if (!this.selectedEstrategia || !this.selectedComponente || !this.selectedYear) {
      this.avanceIndicadoresData = [];
      return;
    }

    this.loadIndicadores();
  }

  // =========================
  // INDICADORES
  // =========================
  loadIndicadores() {
    this.loading = true;

    this.dashboardService.getAvanceIndicadores(
      this.selectedYear!,
      this.selectedEstrategia!,
      this.selectedComponente!
    ).subscribe(res => {

      this.avanceIndicadoresData = res.map(ind => {
        const valor_total =
          ind.meses?.reduce((acc: number, m: any) => acc + (m.valor || 0), 0) || 0;

        const avance_total =
          ind.meta ? (valor_total / ind.meta) * 100 : 0;

        return {
          ...ind,
          valor_total,
          avance_total
        };
      });

      this.loading = false;
    });
  }
}

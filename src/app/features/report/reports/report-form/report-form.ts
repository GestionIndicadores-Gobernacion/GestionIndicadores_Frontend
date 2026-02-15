import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { StrategyModel } from '../../../../core/models/strategy.model';
import {
  ComponentModel,
  ComponentIndicatorModel
} from '../../../../core/models/component.model';

import {
  ReportCreateRequest,
  ReportModel,
  ZoneType
} from '../../../../core/models/report.model';

import { StrategiesService } from '../../../../core/services/strategies.service';
import { ComponentsService } from '../../../../core/services/components.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MUNICIPIOS_VALLE } from '../../../../core/data/municipios';

@Component({
  selector: 'app-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './report-form.html',
  styleUrl: './report-form.css',
})
export class ReportFormComponent implements OnInit {

  loading = false;
  saving = false;
  attemptedSubmit = false;
  isEdit = false;
  id?: number;

  strategies: StrategyModel[] = [];
  components: ComponentModel[] = [];
  allComponents: ComponentModel[] = [];

  indicators: ComponentIndicatorModel[] = [];

  // Guarda valores dinámicos por indicator_id
  indicatorValues: Record<number, any> = {};

  municipios = MUNICIPIOS_VALLE;

  form = {
    strategy_id: null as number | null,
    component_id: null as number | null,

    report_date: '',

    executive_summary: '',
    activities_performed: '',

    intervention_location: '',
    zone_type: null as ZoneType | null,

    evidence_link: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private reportsService: ReportsService,
    private toast: ToastService
  ) { }

  // ============================
  // INIT
  // ============================

  ngOnInit(): void {

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.loadBaseData();
  }

  // ============================
  // LOAD BASE DATA
  // ============================

  loadBaseData(): void {

    this.loading = true;

    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategies = strategies;

        this.componentsService.getAll().subscribe({
          next: components => {
            this.allComponents = components;
            this.loading = false;

            if (this.isEdit) {
              this.loadReport();
            }
          },
          error: () => {
            this.toast.error('Error cargando componentes');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.toast.error('Error cargando estrategias');
        this.loading = false;
      }
    });
  }

  // ============================
  // LOAD REPORT (EDIT MODE)
  // ============================

  loadReport(): void {

    if (!this.id) return;

    this.loading = true;

    this.reportsService.getById(this.id).subscribe({
      next: (report: ReportModel) => {

        this.form = {
          strategy_id: report.strategy_id,
          component_id: report.component_id,

          report_date: report.report_date,

          executive_summary: report.executive_summary,
          activities_performed: report.activities_performed,

          intervention_location: report.intervention_location,
          zone_type: report.zone_type,

          evidence_link: report.evidence_link || ''
        };



        this.onStrategyChange(false);
        this.onComponentChange(false);

        // Cargar valores existentes
        report.indicator_values.forEach(iv => {
          this.indicatorValues[iv.indicator_id] = iv.value;
        });

        this.loading = false;
      },
      error: () => {
        this.toast.error('Error cargando reporte');
        this.loading = false;
      }
    });
  }

  // ============================
  // STRATEGY CHANGE
  // ============================

  onStrategyChange(reset = true): void {

    this.components = this.allComponents.filter(
      c => c.strategy_id === this.form.strategy_id
    );

    if (reset) {
      this.form.component_id = null;
      this.indicators = [];
      this.indicatorValues = {};
    }
  }

  // ============================
  // COMPONENT CHANGE
  // ============================

  onComponentChange(reset = true): void {

    if (!this.form.component_id) return;

    const component = this.allComponents.find(
      c => c.id === this.form.component_id
    ) as any;

    // Si tu endpoint trae indicadores expandido
    this.indicators = component?.indicators || [];

    if (reset) {
      this.indicatorValues = {};

      // Inicializar sum_group automáticamente
      this.indicators.forEach(ind => {
        if (ind.field_type === 'sum_group') {
          this.indicatorValues[ind.id] = {};
          (ind.config?.fields || []).forEach((field: string) => {
            this.indicatorValues[ind.id][field] = 0;
          });
        }
      });
    }
  }

  // ============================
  // SUM GROUP HELPERS
  // ============================

  getSumGroupValue(indicatorId: number, field: string): number {

    return this.indicatorValues[indicatorId]?.[field] ?? 0;
  }

  setSumGroupValue(indicatorId: number, field: string, value: any): void {

    if (!this.indicatorValues[indicatorId]) {
      this.indicatorValues[indicatorId] = {};
    }

    this.indicatorValues[indicatorId][field] = Number(value);
  }

  getSumGroupTotal(indicatorId: number): number {

    const obj = this.indicatorValues[indicatorId];
    if (!obj) return 0;

    return Object.values(obj).reduce(
      (acc: number, val: any) => acc + (Number(val) || 0),
      0
    );
  }

  // ============================
  // BUILD PAYLOAD
  // ============================

  buildIndicatorValues() {

    return this.indicators.map(ind => {

      let value = this.indicatorValues[ind.id];

      if (ind.field_type === 'sum_group') {
        value = value || {};
      }

      if (value === undefined || value === null) {
        value = ind.field_type === 'number' ? 0 : null;
      }

      return {
        indicator_id: ind.id,
        value
      };
    });
  }

  // ============================
  // SAVE
  // ============================

  save(): void {

    this.attemptedSubmit = true;

    if (
      !this.form.strategy_id ||
      !this.form.component_id ||
      !this.form.report_date ||
      !this.form.executive_summary ||
      !this.form.activities_performed ||
      !this.form.intervention_location ||
      !this.form.zone_type
    ) {
      this.toast.error('Campos obligatorios incompletos');
      return;
    }


    this.saving = true;

    const payload: ReportCreateRequest = {
      strategy_id: this.form.strategy_id,
      component_id: this.form.component_id,

      report_date: this.form.report_date,

      executive_summary: this.form.executive_summary,
      activities_performed: this.form.activities_performed,

      intervention_location: this.form.intervention_location,
      zone_type: this.form.zone_type,

      evidence_link: this.form.evidence_link || null,
      indicator_values: this.buildIndicatorValues()
    };


    const request = this.isEdit
      ? this.reportsService.update(this.id!, payload)
      : this.reportsService.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(
          this.isEdit ? 'Reporte actualizado' : 'Reporte creado'
        );
        this.router.navigate(['reports']);
      },
      error: () => {
        this.toast.error('Error al guardar');
        this.saving = false;
      }
    });
  }

  getProgressPercentage(ind: ComponentIndicatorModel): number {

    const meta = this.getTargetForIndicator(ind);
    const value = Number(this.indicatorValues[ind.id] || 0);

    if (!meta || meta === 0) return 0;

    const percentage = (value / meta) * 100;
    return Math.min(Math.round(percentage), 100);
  }

  getProgressClass(ind: any): string {
    const percentage = this.getProgressPercentage(ind);

    if (percentage >= 100) return 'progress-success';
    if (percentage >= 60) return 'progress-warning';
    return 'progress-danger';
  }

  getTargetForIndicator(ind: ComponentIndicatorModel): number | null {

    if (!this.form.report_date || !ind.targets?.length) return null;

    const year = new Date(this.form.report_date).getFullYear();

    const target = ind.targets.find(t => t.year === year);

    return target ? target.target_value : null;
  }

  onDateChange(): void {
    // fuerza recalculo visual
    this.indicators = [...this.indicators];
  }

  // ============================
  // CANCEL
  // ============================

  cancel(): void {
    this.router.navigate(['reports']);
  }
}

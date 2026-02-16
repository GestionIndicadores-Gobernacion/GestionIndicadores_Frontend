import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  ComponentIndicatorModel,
  ComponentModel
} from '../../../../core/models/component.model';
import { StrategyModel } from '../../../../core/models/strategy.model';

import {
  ReportCreateRequest,
  ReportIndicatorValue,
  ReportModel,
  ZoneType
} from '../../../../core/models/report.model';

import { MUNICIPIOS_VALLE } from '../../../../core/data/municipios';
import { ComponentsService } from '../../../../core/services/components.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReportIndicatorsFormComponent } from './report-indicators-form/report-indicators-form';


@Component({
  selector: 'app-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReportIndicatorsFormComponent],
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
  indicatorValues: Record<number, any> = {};

  municipios = MUNICIPIOS_VALLE;

  // Fecha máxima (hoy) en formato YYYY-MM-DD
  todayDate: string;

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
  ) {
    // Calcular fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;
    this.loadBaseData();
  }

  showError(field: keyof typeof this.form): boolean {
    return this.attemptedSubmit && !this.form[field];
  }

  isFormValid(): boolean {
    return !!(
      this.form.strategy_id &&
      this.form.component_id &&
      this.form.report_date &&
      this.form.executive_summary &&
      this.form.activities_performed &&
      this.form.intervention_location &&
      this.form.zone_type
    );
  }

  openDate(input: HTMLInputElement) {
    try { input.showPicker(); } catch { }
  }

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

  onComponentChange(reset = true): void {

    if (!this.form.component_id) return;

    const component = this.allComponents.find(
      c => c.id === this.form.component_id
    ) as any;

    this.indicators = component?.indicators || [];

    if (reset) {
      this.indicatorValues = {};
    }
  }

  // =====================================================
  // BUILD INDICATOR VALUES PARA ENVIAR AL BACKEND
  // =====================================================

  buildIndicatorValues(): ReportIndicatorValue[] {
    return this.indicators.map(ind => ({
      indicator_id: ind.id!,
      value: this.indicatorValues[ind.id!] ?? null
    }));
  }

  save(): void {

    this.attemptedSubmit = true;

    if (!this.isFormValid()) {
      this.toast.error('Revisa los campos marcados');
      return;
    }

    this.saving = true;

    const payload: ReportCreateRequest = {
      strategy_id: this.form.strategy_id!,
      component_id: this.form.component_id!,
      report_date: this.form.report_date,
      executive_summary: this.form.executive_summary,
      activities_performed: this.form.activities_performed,
      intervention_location: this.form.intervention_location,
      zone_type: this.form.zone_type!,
      evidence_link: this.form.evidence_link || null,
      indicator_values: this.buildIndicatorValues()
    };

    const request = this.isEdit
      ? this.reportsService.update(this.id!, payload)
      : this.reportsService.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Reporte actualizado' : 'Reporte creado');
        this.router.navigate(['reports']);
      },
      error: () => {
        this.toast.error('Error al guardar');
        this.saving = false;
      }
    });
  }

  onDateChange(): void { }

  cancel(): void {
    this.router.navigate(['reports']);
  }
}
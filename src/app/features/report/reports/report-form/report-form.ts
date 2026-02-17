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
    const basicFieldsValid = !!(
      this.form.strategy_id &&
      this.form.component_id &&
      this.form.report_date &&
      this.form.executive_summary &&
      this.form.activities_performed &&
      this.form.intervention_location &&
      this.form.zone_type
    );

    if (!basicFieldsValid) return false;

    // Validar indicadores requeridos
    const requiredIndicatorsValid = this.indicators
      .filter(ind => ind.is_required)
      .every(ind => this.isIndicatorValid(ind));

    return requiredIndicatorsValid;
  }

  isIndicatorValid(ind: ComponentIndicatorModel): boolean {
    const value = this.indicatorValues[ind.id!];

    switch (ind.field_type) {
      case 'select':
        return value !== null && value !== undefined && value !== '';

      case 'multi_select':
        return Array.isArray(value) && value.length > 0;

      case 'number':
        return value !== null && value !== undefined && value !== '';

      case 'text':
        return value !== null && value !== undefined && String(value).trim() !== '';

      case 'sum_group':
        // Al menos un campo debe tener valor > 0
        if (!value || typeof value !== 'object') return false;
        return Object.values(value).some(v => Number(v) > 0);

      case 'grouped_data':
        // Debe haber al menos un grupo con datos
        if (!value || typeof value !== 'object') return false;
        const groups = Object.keys(value);
        return groups.length > 0;

      default:
        return true;
    }
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
    return this.indicators.map(ind => {
      const rawValue = this.indicatorValues[ind.id!];
      let finalValue: any;

      // Handle different field types
      switch (ind.field_type) {
        case 'multi_select':
          // Multi-select debe ser un array, nunca null
          finalValue = Array.isArray(rawValue) ? rawValue : [];
          break;

        case 'sum_group':
          // Sum group debe ser un objeto con todos los campos como números
          finalValue = {};
          if (rawValue && typeof rawValue === 'object') {
            Object.keys(rawValue).forEach(field => {
              const val = rawValue[field];
              // Convertir a número, si está vacío usar 0
              if (val !== '' && val !== null && val !== undefined) {
                const numValue = Number(val);
                finalValue[field] = !isNaN(numValue) ? numValue : 0;
              } else {
                finalValue[field] = 0;
              }
            });
          }
          break;

        case 'grouped_data':
          // Grouped data debe ser un objeto anidado con todos los sub-campos
          finalValue = {};

          if (rawValue && typeof rawValue === 'object') {
            // Para cada grupo, incluir todos los sub-fields
            Object.keys(rawValue).forEach(groupKey => {
              finalValue[groupKey] = {};

              // Incluir todos los sub-fields definidos en la config
              ind.config?.sub_fields?.forEach((subField: any) => {
                const value = rawValue[groupKey]?.[subField.name];

                if (subField.type === 'number') {
                  // Para números: convertir a número, si está vacío usar 0
                  if (value !== null && value !== undefined && value !== '') {
                    const numValue = Number(value);
                    finalValue[groupKey][subField.name] = !isNaN(numValue) ? numValue : 0;
                  } else {
                    finalValue[groupKey][subField.name] = 0;
                  }
                } else {
                  // Para texto: convertir a string, si está vacío usar string vacío
                  finalValue[groupKey][subField.name] = value ? String(value) : '';
                }
              });
            });
          }
          break;

        case 'number':
          // Number puede ser null si está vacío
          finalValue = rawValue !== '' && rawValue != null ? Number(rawValue) : null;
          break;

        case 'text':
          // Text puede ser null si está vacío
          finalValue = rawValue || null;
          break;

        case 'select':
          // Select puede ser null si no se seleccionó nada
          finalValue = rawValue || null;
          break;

        default:
          finalValue = rawValue ?? null;
      }

      return {
        indicator_id: ind.id!,
        value: finalValue
      };
    });
  }

  save(): void {

    this.attemptedSubmit = true;

    if (!this.isFormValid()) {
      // Identificar qué campos faltan
      const missingFields: string[] = [];

      if (!this.form.strategy_id) missingFields.push('Estrategia');
      if (!this.form.component_id) missingFields.push('Componente');
      if (!this.form.report_date) missingFields.push('Fecha');
      if (!this.form.executive_summary) missingFields.push('Resultado obtenido');
      if (!this.form.activities_performed) missingFields.push('Actividades realizadas');
      if (!this.form.intervention_location) missingFields.push('Municipio');
      if (!this.form.zone_type) missingFields.push('Zona');

      // Verificar indicadores requeridos
      this.indicators
        .filter(ind => ind.is_required && !this.isIndicatorValid(ind))
        .forEach(ind => missingFields.push(ind.name));

      if (missingFields.length > 0) {
        this.toast.error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
      } else {
        this.toast.error('Revisa los campos marcados');
      }
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

    // DEBUG: Ver qué se está enviando
    console.log('=== PAYLOAD COMPLETO ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('=== INDICATOR VALUES ===');
    payload.indicator_values.forEach(iv => {
      const ind = this.indicators.find(i => i.id === iv.indicator_id);
      console.log(`${ind?.name} (${ind?.field_type}):`, iv.value);
    });

    const request = this.isEdit
      ? this.reportsService.update(this.id!, payload)
      : this.reportsService.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Reporte actualizado' : 'Reporte creado');
        this.router.navigate(['reports']);
      },
      error: (err) => {
        console.error('ERROR DEL BACKEND:', err);
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
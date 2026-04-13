import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  ComponentIndicatorModel,
  ComponentModel
} from '../../../../features/report/models/component.model';
import { StrategyModel } from '../../../../features/report/models/strategy.model';

import {
  ReportCreateRequest,
  ReportIndicatorValue,
  ReportModel,
  ZoneType
} from '../../../../features/report/models/report.model';

import { MUNICIPIOS_VALLE } from '../../../../core/data/municipios';
import { ComponentsService } from '../../../../features/report/services/components.service';
import { ReportsService } from '../../../../features/report/services/reports.service';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReportIndicatorsFormComponent } from './report-indicators-form/report-indicators-form';
import { ActionPlanService } from '../../../../features/action-plans/services/action-plan.service';

@Component({
  selector: 'app-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReportIndicatorsFormComponent],
  templateUrl: './report-form.html',
  styleUrl: './report-form.css',
})
export class ReportFormComponent implements OnInit {

  @ViewChild(ReportIndicatorsFormComponent)
  reportIndicatorsForm?: ReportIndicatorsFormComponent;

  saving = false;
  isEdit = false;
  isFromActivity = false;

  id?: number;

  strategies: StrategyModel[] = [];
  components: ComponentModel[] = [];
  allComponents: ComponentModel[] = [];

  indicators: ComponentIndicatorModel[] = [];
  indicatorValues: Record<number, any> = {};

  municipios = MUNICIPIOS_VALLE;
  todayDate: string;

  private currentUser: any = null;

  form = {
    strategy_id: null as number | null,
    component_id: null as number | null,
    report_date: null as string | null,
    executive_summary: '',
    intervention_location: null as string | null,
    zone_type: null as ZoneType | null,
    evidence_link: '',
    action_plan_activity_id: null as number | null,
  };

  activityPrefill: {
    activity_id: number;
    activity_name: string;
    linked_report: any | null;
    report_by_evidence_link: { id: number } | null;
  } | null = null;

  prefillLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private reportsService: ReportsService,
    private actionPlanService: ActionPlanService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') ?? 'null');
    this.id = Number(this.route.snapshot.paramMap.get('id')) || undefined;
    this.isEdit = !!this.id;
    const activityId = this.route.snapshot.queryParamMap.get('activityId');
    this.isFromActivity = !!activityId;
    this.loadBaseData(activityId ? +activityId : null);
  }


  // ================= BASE DATA =================

  private extractArray<T>(resp: any): T[] {
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp?.data)) return resp.data;
    if (Array.isArray(resp?.items)) return resp.items;
    if (Array.isArray(resp?.results)) return resp.results;
    return [];
  }

  private filterComponentsByRole(components: ComponentModel[]): ComponentModel[] {
    const role = this.currentUser?.role?.name;
    if (role === 'admin' || role === 'monitor') return components;
    if (role === 'editor') {
      const assigned = (this.currentUser?.component_assignments ?? []).map((c: any) => c.component_id);
      return components.filter(c => assigned.includes(c.id));
    }
    return components;
  }

  private filterStrategiesByRole(strategies: StrategyModel[]): StrategyModel[] {
    const role = this.currentUser?.role?.name;
    if (role === 'admin' || role === 'monitor') return strategies;
    if (role === 'editor') {
      const assigned = (this.currentUser?.component_assignments ?? []).map((c: any) => c.component_id);
      // Solo estrategias que tengan al menos un componente asignado al usuario
      const allowedStrategyIds = new Set(
        this.allComponents
          .filter(c => assigned.includes(c.id))
          .map(c => c.strategy_id)
      );
      return strategies.filter(s => allowedStrategyIds.has(s.id));
    }
    return strategies;
  }

  loadBaseData(activityId: number | null = null): void {
    this.strategiesService.getAll().subscribe({
      next: (strategiesResp: any) => {
        const allStrategies = this.extractArray<StrategyModel>(strategiesResp);
        this.componentsService.getAll().subscribe({
          next: (componentsResp: any) => {
            this.allComponents = this.extractArray<ComponentModel>(componentsResp);

            // ← aplicar filtro de estrategias DESPUÉS de tener allComponents
            this.strategies = this.filterStrategiesByRole(allStrategies);

            if (this.isEdit) {
              this.loadReport();
            } else if (activityId) {
              this.loadPrefill(activityId);
            }
          },
          error: () => this.toast.error('Error cargando componentes')
        });
      },
      error: () => this.toast.error('Error cargando estrategias')
    });
  }
  
  loadPrefill(activityId: number): void {
    this.prefillLoading = true;
    this.actionPlanService.getPrefillForReport(activityId).subscribe({
      next: (prefill) => {
        this.prefillLoading = false;
        this.activityPrefill = prefill;

        // Si ya existe un reporte vinculado, redirigir a editar ese reporte
        if (prefill.linked_report) {
          this.toast.info(`Esta actividad ya tiene un reporte asociado (# ${prefill.linked_report.id})`);
          this.router.navigate(['reports', prefill.linked_report.id, 'edit']);
          return;
        }

        // Si existe un reporte por evidence_link, advertir pero no bloquear
        // El usuario puede elegir vincularlo o ignorarlo

        // Precargar campos
        const p = prefill.prefill;
        this.form.strategy_id = p.strategy_id;
        this.form.evidence_link = p.evidence_link ?? '';
        this.form.action_plan_activity_id = activityId;

        // Cargar componentes del filtrado por estrategia
        this.components = this.filterComponentsByRole(
          this.allComponents.filter(c => c.strategy_id === p.strategy_id)
        );

        this.form.component_id = p.component_id;

        // Cargar indicadores del componente
        const component = this.allComponents.find(c => c.id === p.component_id) as any;
        this.indicators = component?.indicators || [];

        this.cdr.detectChanges();
      },
      error: () => {
        this.prefillLoading = false;
        this.toast.error('Error cargando datos de la actividad');
      }
    });
  }


  // ================= EDIT =================

  loadReport(): void {
    if (!this.id) return;

    this.reportsService.getById(this.id).subscribe({
      next: (report: ReportModel) => {

        this.form = {
          strategy_id: report.strategy_id,
          component_id: report.component_id,
          report_date: report.report_date?.substring(0, 10) ?? null,
          executive_summary: report.executive_summary,
          intervention_location: report.intervention_location ?? null,
          zone_type: this.normalizeZoneType(report.zone_type),
          evidence_link: report.evidence_link || '',
          action_plan_activity_id: report.action_plan_activity_id ?? null,
        };

        this.components = this.filterComponentsByRole(
          this.allComponents.filter(c => c.strategy_id === report.strategy_id)
        );


        const component = this.allComponents.find(c => c.id === report.component_id) as any;
        this.indicators = component?.indicators || [];

        const values: Record<number, any> = {};
        report.indicator_values?.forEach(iv => values[iv.indicator_id] = iv.value);
        this.indicatorValues = values;

        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Error cargando reporte')
    });
  }

  private normalizeZoneType(value: any): ZoneType | null {
    if (!value) return null;
    const str = String(value).toUpperCase();
    if (str.includes('URBAN')) return 'Urbana';
    if (str.includes('RURAL')) return 'Rural';
    return null;
  }

  // ================= EVENTS =================

  onStrategyChange(): void {
    const allForStrategy = this.allComponents.filter(
      c => c.strategy_id === this.form.strategy_id
    );
    // ← aplicar filtro por rol
    this.components = this.filterComponentsByRole(allForStrategy);
    this.form.component_id = null;
    this.indicators = [];
    this.indicatorValues = {};
  }

  onComponentChange(): void {
    const component = this.allComponents.find(c => c.id === this.form.component_id) as any;
    this.indicators = component?.indicators || [];
    this.indicatorValues = {};
  }

  onIndicatorValuesChange(values: Record<number, any>): void {
    this.indicatorValues = { ...values }; // reemplazar completo, no mergear
    this.cdr.detectChanges();
  }

  // ================= SAVE =================

  /** Convierte null / undefined / '' a 0 para valores numéricos */
  private toNum(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  private sanitizeIndicatorValue(ind: ComponentIndicatorModel, value: any): any {
    switch (ind.field_type) {

      case 'number':
        return this.toNum(value);

      case 'sum_group': {
        if (!value || typeof value !== 'object') return {};
        const result: Record<string, number> = {};
        // Usar los fields del config como fuente de verdad
        const fields: string[] = ind.config?.fields || [];
        fields.forEach((field: string) => {
          result[field] = this.toNum(value[field]);  // toNum ya convierte null/undefined a 0
        });
        return result;
      }

      case 'grouped_data': {
        if (!value || typeof value !== 'object') return {};
        const result: Record<string, any> = {};
        Object.keys(value).forEach(groupKey => {
          result[groupKey] = {};
          const subFields: any[] = ind.config?.sub_fields || [];
          subFields.forEach((sf: any) => {
            const raw = value[groupKey]?.[sf.name];
            result[groupKey][sf.name] = sf.type === 'number' ? this.toNum(raw) : (raw ?? '');
          });
        });
        return result;
      }

      case 'categorized_group': {
        if (!value) return { selected_categories: [], data: {}, sub_sections: {} };

        const sanitized = JSON.parse(JSON.stringify(value));

        // Sanitizar métricas numéricas
        if (sanitized.data) {
          Object.keys(sanitized.data).forEach(cat => {
            Object.keys(sanitized.data[cat]).forEach(group => {
              Object.keys(sanitized.data[cat][group]).forEach(metricKey => {
                sanitized.data[cat][group][metricKey] =
                  this.toNum(sanitized.data[cat][group][metricKey]);
              });
            });
          });
        }

        // Sanitizar sub_sections numéricas (protegiendo red_animalia)
        if (sanitized.sub_sections) {
          Object.keys(sanitized.sub_sections).forEach(sectionKey => {

            // 🔴 NO tocar red_animalia
            if (sectionKey === 'red_animalia') return;

            const section = sanitized.sub_sections[sectionKey];
            if (!section || typeof section !== 'object') return;

            Object.keys(section).forEach(cat => {

              const categoryData = section[cat];
              if (!categoryData || typeof categoryData !== 'object') return;

              Object.keys(categoryData).forEach(metricKey => {
                categoryData[metricKey] = this.toNum(categoryData[metricKey]);
              });

            });

          });
        }

        return sanitized;
      }

      default:
        return value ?? null;
    }
  }

  buildIndicatorValues(): ReportIndicatorValue[] {
    const activeIds = this.reportIndicatorsForm?.getActiveIndicatorIds()
      ?? new Set(this.indicators.map(i => i.id!));

    return this.indicators
      .filter(ind => activeIds.has(ind.id!))
      .map(ind => ({
        indicator_id: ind.id!,
        value: this.sanitizeIndicatorValue(ind, this.indicatorValues[ind.id!])
      }));
  }

  save(formDirective: NgForm): void {
    if (formDirective.invalid) {
      formDirective.control.markAllAsTouched();
      return;
    }

    this.saving = true;

    const payload: ReportCreateRequest = {
      strategy_id: this.form.strategy_id!,
      component_id: this.form.component_id!,
      report_date: this.form.report_date!,
      executive_summary: this.form.executive_summary,
      intervention_location: this.form.intervention_location!,
      zone_type: this.form.zone_type!,
      evidence_link: this.form.evidence_link || null,
      action_plan_activity_id: this.form.action_plan_activity_id ?? null,
      indicator_values: this.buildIndicatorValues()
    };

    const request = this.isEdit
      ? this.reportsService.update(this.id!, payload)
      : this.reportsService.create(payload);

    request.subscribe({
      next: (savedReport) => {                          // ← recibir el reporte guardado
        this.toast.success(this.isEdit ? 'Reporte actualizado' : 'Reporte creado');

        // ── Si vino desde una actividad, regresar al plan de acción ──
        if (this.form.action_plan_activity_id && !this.isEdit) {
          this.router.navigate(['/action-plans'], {
            queryParams: {
              reportActivity: this.form.action_plan_activity_id,
              evidenceUrl: savedReport.evidence_link ?? ''
            }
          });
        } else {
          this.router.navigate(['reports']);
        }
      },
      error: () => {
        this.toast.error('Error al guardar');
        this.saving = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['reports']);
  }
}
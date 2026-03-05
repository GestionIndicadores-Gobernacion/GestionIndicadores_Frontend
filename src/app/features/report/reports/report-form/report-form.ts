import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
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

  saving = false;
  isEdit = false;
  id?: number;

  strategies: StrategyModel[] = [];
  components: ComponentModel[] = [];
  allComponents: ComponentModel[] = [];

  indicators: ComponentIndicatorModel[] = [];
  indicatorValues: Record<number, any> = {};

  municipios = MUNICIPIOS_VALLE;
  todayDate: string;

  form = {
    strategy_id: null as number | null,
    component_id: null as number | null,
    report_date: null as string | null,
    executive_summary: '',
    intervention_location: null as string | null,
    zone_type: null as ZoneType | null,
    evidence_link: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private reportsService: ReportsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;
    this.loadBaseData();
  }

  // ================= BASE DATA =================

  private extractArray<T>(resp: any): T[] {
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp?.data)) return resp.data;
    if (Array.isArray(resp?.items)) return resp.items;
    if (Array.isArray(resp?.results)) return resp.results;
    return [];
  }

  loadBaseData(): void {
    this.strategiesService.getAll().subscribe({
      next: (strategiesResp: any) => {

        this.strategies = this.extractArray<StrategyModel>(strategiesResp);

        this.componentsService.getAll().subscribe({
          next: (componentsResp: any) => {

            this.allComponents = this.extractArray<ComponentModel>(componentsResp);

            if (this.isEdit) {
              this.loadReport();
            }

          },
          error: () => this.toast.error('Error cargando componentes')
        });

      },
      error: () => this.toast.error('Error cargando estrategias')
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
          evidence_link: report.evidence_link || ''
        };

        this.components = this.allComponents.filter(
          c => c.strategy_id === report.strategy_id
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
    this.components = this.allComponents.filter(
      c => c.strategy_id === this.form.strategy_id
    );
    this.form.component_id = null;
    this.indicators = [];
    this.indicatorValues = {};
  }

  onComponentChange(): void {
    const component = this.allComponents.find(c => c.id === this.form.component_id) as any;
    this.indicators = component?.indicators || [];
    this.indicatorValues = {};
  }

  // ================= SAVE =================

  buildIndicatorValues(): ReportIndicatorValue[] {
    return this.indicators.map(ind => ({
      indicator_id: ind.id!,
      value: this.indicatorValues[ind.id!] ?? null
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

  cancel(): void {
    this.router.navigate(['reports']);
  }
}
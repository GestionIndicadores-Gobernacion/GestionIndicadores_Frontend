import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { StrategiesService } from '../../../core/services/strategy.service';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ToastService } from '../../../core/services/toast.service';

import { ComponentModel } from '../../../core/models/component.model';
import { ActivityModel } from '../../../core/models/activity.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { RecordCreateRequest, RecordDetallePoblacion } from '../../../core/models/record.model';

import { MUNICIPIOS_VALLE } from '../../../core/data/municipios';
import { MultiSelectComponent } from '../../../shared/components/multi-select/multi-select';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MultiSelectComponent],
  templateUrl: './record-form.html',
  styleUrl: './record-form.css',
})
export class RecordFormComponent {
  indicadorAvanceActual: Record<string, number> = {};

  municipios = MUNICIPIOS_VALLE;
  selectedMunicipios: string[] = [];

  private skipNextSubmit = false;

  loading = false;
  saving = false;
  isEdit = false;
  attemptedSubmit = false;
  id?: number;

  /** 🔥 FLAG CLAVE */
  isLoadingRecord = false;

  strategies: any[] = [];
  allActivities: ActivityModel[] = [];
  activities: ActivityModel[] = [];
  allComponents: ComponentModel[] = [];
  components: ComponentModel[] = [];
  allIndicators: IndicatorModel[] = [];
  indicators: IndicatorModel[] = [];

  form = {
    strategy_id: null as number | null,
    activity_id: null as number | null,
    component_id: null as number | null,
    fecha: '',
    description: '',
    actividades_realizadas: '',
    evidencia_url: ''
  };

  detallePoblacion: RecordDetallePoblacion = { municipios: {} };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService,
    private strategiesService: StrategiesService,
    private dashboardService: DashboardService,
    private activitiesService: ActivitiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.form.fecha = new Date().toISOString().split('T')[0];

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.loadBaseData();
    if (this.isEdit) this.loadRecord();
  }

  loadBaseData() {
    this.strategiesService.getAll().subscribe(r => this.strategies = r);
    this.activitiesService.getAll().subscribe(r => this.allActivities = r);
    this.componentsService.getAll().subscribe(r => this.allComponents = r);
    this.indicatorsService.getAll().subscribe(r => this.allIndicators = r);
  }

  loadRecord() {
    this.loading = true;
    this.isLoadingRecord = true;

    this.recordsService.getById(this.id!).subscribe(r => {

      this.form.component_id = r.component_id;
      this.form.fecha = r.fecha;
      this.form.description = r.description ?? '';
      this.form.actividades_realizadas = r.actividades_realizadas ?? '';
      this.form.evidencia_url = r.evidencia_url ?? '';

      const comp = this.allComponents.find(c => c.id === r.component_id);
      if (comp) {
        this.form.activity_id = comp.activity_id;
        const act = this.allActivities.find(a => a.id === comp.activity_id);
        if (act) this.form.strategy_id = act.strategy_id;
      }

      this.onStrategyChange(false);
      this.onActivityChange(false);
      this.onComponentChange(false);

      this.detallePoblacion = r.detalle_poblacion ?? { municipios: {} };
      this.selectedMunicipios = Object.keys(this.detallePoblacion.municipios);

      this.loading = false;
      this.isLoadingRecord = false;
    });
  }

  onStrategyChange(reset = true) {
    this.activities = this.allActivities.filter(a => a.strategy_id === this.form.strategy_id);
    if (reset) {
      this.form.activity_id = null;
      this.form.component_id = null;
      this.components = [];
      this.indicators = [];
    }
  }

  onActivityChange(reset = true) {
    this.components = this.allComponents.filter(c => c.activity_id === this.form.activity_id);
    if (reset) {
      this.form.component_id = null;
      this.indicators = [];
    }
  }

  onComponentChange(reset = true) {

    this.indicators = this.allIndicators
      .filter(i => i.component_id === this.form.component_id)
      .map(ind => ({
        ...ind,
        acumulado: 0   // 👈 NUEVO
      }));

    if (reset) {
      this.selectedMunicipios = [];
      this.detallePoblacion = { municipios: {} };
    }

    // 🔥 CONSULTAR AVANCE ACTUAL
    this.dashboardService.getAvanceIndicadores(
      new Date(this.form.fecha).getFullYear(),
      this.form.strategy_id!,
      this.form.component_id!
    ).subscribe(res => {

      res.forEach((r: any) => {
        const found = this.indicators.find(i => i.id === r.indicador_id);
        if (found) {
          const total = r.meses?.reduce((acc: number, m: any) => acc + m.valor, 0) || 0;
          found.acumulado = total;
        }
      });

    });
  }

  /** ✅ MÉTODO CLAVE CORREGIDO */
  onMunicipiosChange() {

    // 👇 CLAVE: marcar que este cambio NO debe guardar
    this.skipNextSubmit = true;

    if (this.isLoadingRecord) return;

    const ALL = 'Todo el Valle del Cauca';

    if (this.selectedMunicipios.includes(ALL)) {
      this.selectedMunicipios = [ALL];
    }

    Object.keys(this.detallePoblacion.municipios).forEach(m => {
      if (!this.selectedMunicipios.includes(m)) {
        delete this.detallePoblacion.municipios[m];
      }
    });

    this.selectedMunicipios.forEach(m => {
      if (!this.detallePoblacion.municipios[m]) {
        this.detallePoblacion.municipios[m] = { indicadores: {} };
        this.indicators.forEach(ind => {
          this.detallePoblacion.municipios[m].indicadores[ind.name] = 0;
        });
      }
    });
  }

  onSubmit(event: Event) {

    // 🚫 Si el submit viene de municipios, NO guardar
    if (this.skipNextSubmit) {
      this.skipNextSubmit = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // ✅ Submit real (botón Guardar)
    this.save();
  }


  buildPayload(): RecordCreateRequest {
    return {
      component_id: this.form.component_id!,
      fecha: this.form.fecha,
      description: this.form.description || null,
      actividades_realizadas: this.form.actividades_realizadas || null,
      detalle_poblacion: this.detallePoblacion,
      evidencia_url: this.form.evidencia_url || null,
    };
  }

  save() {
    this.attemptedSubmit = true;

    if (!this.form.component_id || !this.form.description || !this.form.actividades_realizadas) {
      this.toast.warning('Completa los campos obligatorios');
      return;
    }

    // 🚨 VALIDACIÓN DE MUNICIPIOS (LA ÚNICA NECESARIA)
    if (!this.hasMunicipios()) {
      this.toast.warning('Debes seleccionar al menos un municipio');
      return;
    }

    const payload = this.buildPayload();
    const req = this.isEdit
      ? this.recordsService.update(this.id!, payload)
      : this.recordsService.create(payload);

    req.subscribe(() => {
      this.toast.success(this.isEdit ? 'Registro actualizado' : 'Registro creado');
      this.router.navigate(['records']);
    });
  }

  validateIndicadorValue(municipio: string, ind: IndicatorModel) {
    const v = this.detallePoblacion.municipios[municipio].indicadores[ind.name];
    if (v > ind.meta) {
      this.detallePoblacion.municipios[municipio].indicadores[ind.name] = ind.meta;
      this.toast.warning(`"${ind.name}" no puede superar ${ind.meta}`);
    }
  }

  hasMunicipios(): boolean {
    return this.selectedMunicipios.length > 0;
  }


  cancel() {
    this.router.navigate(['records']);
  }
}

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

export type TipoPoblacionKey =
  | 'mujeres'
  | 'poblacion_afro'
  | 'discapacidad';

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MultiSelectComponent],
  templateUrl: './record-form.html',
  styleUrl: './record-form.css',
})
export class RecordFormComponent {
  readonly MUNICIPIO_TODO_VALLE = 'Todo el Valle del Cauca';

  tiposPoblacion: { key: TipoPoblacionKey; label: string }[] = [
    { key: 'mujeres', label: 'Mujeres' },
    { key: 'poblacion_afro', label: 'Población afro' },
    { key: 'discapacidad', label: 'Discapacidad' }
  ];

  municipios = MUNICIPIOS_VALLE;
  selectedMunicipios: string[] = [];

  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

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

    if (this.isEdit) {
      this.loadRecord();
    }
  }

  // =====================================================
  // CARGA BASE
  // =====================================================
  loadBaseData() {
    this.strategiesService.getAll().subscribe(r => this.strategies = r);
    this.activitiesService.getAll().subscribe(r => this.allActivities = r);
    this.componentsService.getAll().subscribe(r => this.allComponents = r);
    this.indicatorsService.getAll().subscribe(r => this.allIndicators = r);
  }

  // =====================================================
  // 🔥 MÉTODO QUE FALTABA
  // =====================================================
  loadRecord() {
    this.loading = true;

    this.recordsService.getById(this.id!).subscribe({
      next: (r) => {
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
      },
      error: () => {
        this.toast.error('Error cargando el registro');
        this.loading = false;
      }
    });
  }

  // =====================================================
  // CASCADAS
  // =====================================================
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
      .map(ind => ({ ...ind, acumulado: 0 }));

    if (reset) {
      this.selectedMunicipios = [];
      this.detallePoblacion = { municipios: {} };
    }

    this.dashboardService.getAvanceIndicadores(
      new Date(this.form.fecha).getFullYear(),
      this.form.strategy_id!,
      this.form.component_id!
    ).subscribe(res => {
      res.forEach((r: any) => {
        const found = this.indicators.find(i => i.id === r.indicador_id);
        if (found) {
          found.acumulado =
            r.meses?.reduce((acc: number, m: any) => acc + m.valor, 0) || 0;
        }
      });
    });
  }

  // =====================================================
  // MUNICIPIOS
  // =====================================================
  onMunicipiosChange() {
    const incluyeTodoValle = this.selectedMunicipios.includes(this.MUNICIPIO_TODO_VALLE);

    // 🚫 Caso 1: seleccionan "Todo el Valle del Cauca"
    if (incluyeTodoValle) {

      // dejamos SOLO ese municipio
      this.selectedMunicipios = [this.MUNICIPIO_TODO_VALLE];

      // reiniciamos detalle poblacional
      this.detallePoblacion = { municipios: {} };

      this.detallePoblacion.municipios[this.MUNICIPIO_TODO_VALLE] = {
        indicadores: {}
      };

      this.indicators.forEach(ind => {
        this.detallePoblacion.municipios[this.MUNICIPIO_TODO_VALLE].indicadores[ind.name] = {
          total: 0,
          tipos_poblacion: ind.es_poblacional
            ? { mujeres: 0, poblacion_afro: 0, discapacidad: 0 }
            : undefined
        };
      });

      return; // ⛔ NO permitir más lógica
    }

    // ✅ Caso 2: municipios normales
    this.selectedMunicipios.forEach(m => {
      if (!this.detallePoblacion.municipios[m]) {
        this.detallePoblacion.municipios[m] = { indicadores: {} };

        this.indicators.forEach(ind => {
          this.detallePoblacion.municipios[m].indicadores[ind.name] = {
            total: 0,
            tipos_poblacion: ind.es_poblacional
              ? { mujeres: 0, poblacion_afro: 0, discapacidad: 0 }
              : undefined
          };
        });
      }
    });

    // 🧹 limpiar municipios eliminados
    Object.keys(this.detallePoblacion.municipios).forEach(m => {
      if (!this.selectedMunicipios.includes(m)) {
        delete this.detallePoblacion.municipios[m];
      }
    });
  }


  // =====================================================
  // 🔢 TOTAL = SUMA POBLACIONAL
  // =====================================================
  updateTotalFromPoblacion(municipio: string, ind: IndicatorModel) {
    const indicador =
      this.detallePoblacion.municipios[municipio]
        .indicadores[ind.name];

    const t = indicador.tipos_poblacion;
    if (!t) return;

    indicador.total =
      (t.mujeres || 0) +
      (t.poblacion_afro || 0) +
      (t.discapacidad || 0);
  }

  // =====================================================
  // GUARDAR
  // =====================================================
  onSubmit(event: Event) {
    event.preventDefault();
    this.save();
  }

  save() {
    if (!this.form.component_id ||
      !this.form.description ||
      !this.form.actividades_realizadas ||
      !this.selectedMunicipios.length) {
      this.toast.warning('Completa los campos obligatorios');
      return;
    }

    const payload: RecordCreateRequest = {
      component_id: this.form.component_id,
      fecha: this.form.fecha,
      description: this.form.description,
      actividades_realizadas: this.form.actividades_realizadas,
      detalle_poblacion: this.detallePoblacion,
      evidencia_url: this.form.evidencia_url || null
    };

    const req = this.isEdit
      ? this.recordsService.update(this.id!, payload)
      : this.recordsService.create(payload);

    req.subscribe(() => {
      this.toast.success(this.isEdit ? 'Registro actualizado' : 'Registro creado');
      this.router.navigate(['records']);
    });
  }

  cancel() {
    this.router.navigate(['records']);
  }
}

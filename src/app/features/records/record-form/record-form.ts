import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentModel } from '../../../core/models/component.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import {
  RecordCreateRequest,
  RecordDetallePoblacion,
  RecordMunicipioDetalle
} from '../../../core/models/record.model';

import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { StrategiesService } from '../../../core/services/strategy.service';

import { MUNICIPIOS_VALLE } from '../../../core/data/municipios';
import { ToastService } from '../../../core/services/toast.service';

import { MultiSelectComponent } from '../../../shared/components/multi-select/multi-select';
import { ActivityModel } from '../../../core/models/activity.model';
import { ActivitiesService } from '../../../core/services/activities.service';

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MultiSelectComponent],
  templateUrl: './record-form.html',
  styleUrl: './record-form.css',
})
export class RecordFormComponent {

  municipios = MUNICIPIOS_VALLE;
  selectedMunicipios: string[] = [];

  today = '';
  loading = false;
  saving = false;
  isEdit = false;
  id?: number;
  attemptedSubmit = false;

  strategies: any[] = [];
  activities: ActivityModel[] = [];
  components: ComponentModel[] = [];
  allComponents: ComponentModel[] = [];
  indicators: IndicatorModel[] = [];
  allIndicators: IndicatorModel[] = [];
  allActivities: ActivityModel[] = [];

  form = {
    strategy_id: null as number | null,
    activity_id: null as number | null,
    component_id: null as number | null,
    fecha: '',
    description: '',
    actividades_realizadas: '',
    evidencia_url: ''
  };

  detallePoblacion: RecordDetallePoblacion = {
    municipios: {}
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService,
    private strategiesService: StrategiesService,
    private activitiesService: ActivitiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];
    this.form.fecha = this.today;

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    if (this.isEdit) this.loading = true;

    this.loadStrategies();
    this.loadActivities();
    this.loadComponents();
    this.loadIndicators();

    if (this.isEdit) this.loadRecord();
  }

  loadStrategies() {
    this.strategiesService.getAll().subscribe({
      next: res => this.strategies = res,
      error: () => this.toast.error("Error cargando estrategias"),
    });
  }

  loadActivities() {
    this.activitiesService.getAll().subscribe({
      next: res => {
        this.allActivities = res;
        this.activities = [];
      },
      error: () => this.toast.error("Error cargando actividades"),
    });
  }

  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: res => {
        this.allComponents = res;
        if (this.form.activity_id) this.onActivityChange(false);
      }
    });
  }

  loadIndicators() {
    this.indicatorsService.getAll().subscribe({
      next: res => this.allIndicators = res,
    });
  }

  loadRecord() {
    this.recordsService.getById(this.id!).subscribe({
      next: r => {
        this.form.strategy_id = r.strategy_id;
        this.form.activity_id = r.activity_id ?? null;
        this.form.component_id = r.component_id ?? null;
        this.form.fecha = r.fecha;
        this.form.description = r.description ?? '';
        this.form.actividades_realizadas = r.actividades_realizadas ?? '';
        this.form.evidencia_url = r.evidencia_url ?? '';

        this.detallePoblacion = r.detalle_poblacion ?? { municipios: {} };
        this.selectedMunicipios = Object.keys(this.detallePoblacion.municipios);

        this.onStrategyChange(false);
        this.onActivityChange(false);
        this.onComponentChange(false);

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error("Error cargando registro");
      }
    });
  }

  onStrategyChange(reset: boolean = true) {
    if (!this.form.strategy_id) {
      this.activities = [];
      this.form.activity_id = null;
      this.components = [];
      this.indicators = [];
      return;
    }

    this.activities = this.allActivities.filter(
      a => a.strategy_id === this.form.strategy_id
    );

    if (reset) {
      this.form.activity_id = null;
      this.form.component_id = null;
      this.indicators = [];
      this.selectedMunicipios = [];
      this.detallePoblacion = { municipios: {} };
    }
  }

  onActivityChange(reset: boolean = true) {
    if (!this.form.activity_id) {
      this.components = [];
      this.indicators = [];
      return;
    }

    this.components = this.allComponents.filter(
      c => c.strategy_id === this.form.strategy_id
    );

    if (reset) {
      this.form.component_id = null;
      this.indicators = [];
      this.selectedMunicipios = [];
      this.detallePoblacion = { municipios: {} };
    }
  }

  onComponentChange(reset: boolean = true) {
    if (!this.form.component_id) {
      this.indicators = [];
      return;
    }

    this.indicators = this.allIndicators.filter(
      i => i.component_id === this.form.component_id
    );

    if (reset) {
      this.selectedMunicipios = [];
      this.detallePoblacion = { municipios: {} };
    }
  }

  onMunicipiosChange() {

    // 🟢 SI ELIGIÓ "Todo el Valle del Cauca"
    if (this.selectedMunicipios.includes("Todo el Valle del Cauca")) {

      // Si eligió el Valle y otros municipios, limpiar los otros
      if (this.selectedMunicipios.length > 1) {
        this.selectedMunicipios = ["Todo el Valle del Cauca"];
      }

      // Regenerar indicadores para el Valle completo
      this.detallePoblacion = {
        municipios: {
          "Todo el Valle del Cauca": {
            indicadores: {}
          }
        }
      };

      this.indicators.forEach(ind => {
        this.detallePoblacion.municipios["Todo el Valle del Cauca"].indicadores[ind.name] = 0;
      });

      return;
    }

    // 🟡 SI QUITÓ "Todo el Valle del Cauca"
    if (!this.selectedMunicipios.includes("Todo el Valle del Cauca") &&
      this.detallePoblacion.municipios["Todo el Valle del Cauca"]) {

      // El usuario lo eliminó, entonces limpiar completamente
      this.detallePoblacion = { municipios: {} };
    }

    // 🟡 COMPORTAMIENTO NORMAL
    const nuevos = this.selectedMunicipios;

    // Crear estructura de indicadores para nuevos municipios
    nuevos.forEach(m => {
      if (!this.detallePoblacion.municipios[m]) {
        const detalle: RecordMunicipioDetalle = { indicadores: {} };

        this.indicators.forEach(ind => {
          detalle.indicadores[ind.name] = 0;
        });

        this.detallePoblacion.municipios[m] = detalle;
      }
    });

    // Eliminar municipios deseleccionados
    Object.keys(this.detallePoblacion.municipios).forEach(m => {
      if (!nuevos.includes(m)) delete this.detallePoblacion.municipios[m];
    });
  }

  buildPayload(): RecordCreateRequest {
    return {
      strategy_id: this.form.strategy_id!,
      activity_id: this.form.activity_id!,
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

    // ============================
    // Validaciones visuales
    // ============================
    if (!this.form.strategy_id || !this.form.activity_id || !this.form.component_id) {
      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }

    if (!this.form.description || !this.form.actividades_realizadas) {
      this.toast.warning("Completa el resumen ejecutivo y las actividades realizadas.");
      return;
    }

    if (this.selectedMunicipios.length === 0) {
      this.toast.warning("Debes seleccionar al menos un municipio.");
      return;
    }

    for (const municipio of this.selectedMunicipios) {
      for (const ind of this.indicators) {
        const valor =
          this.detallePoblacion.municipios[municipio]?.indicadores[ind.name] ?? 0;

        if (valor > ind.meta) {
          this.toast.error(
            `En "${municipio}", el indicador "${ind.name}" supera la meta (${ind.meta}).`
          );
          return;
        }
      }
    }

    const payload = this.buildPayload();

    if (this.isEdit) {
      this.toast.confirm("¿Guardar cambios?", "Se actualizará el registro.")
        .then(res => res.isConfirmed && this.sendRequest(payload));
    } else {
      this.sendRequest(payload);
    }
  }

  private sendRequest(payload: RecordCreateRequest) {
    this.saving = true;

    const obs = this.isEdit
      ? this.recordsService.update(this.id!, payload)
      : this.recordsService.create(payload);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.isEdit ? "Registro actualizado" : "Registro creado correctamente");
        this.router.navigate(['/dashboard/records']);
      },
      error: () => this.saving = false
    });
  }

  validateIndicadorValue(municipio: string, ind: IndicatorModel) {
    const valor =
      this.detallePoblacion.municipios[municipio].indicadores[ind.name];

    if (valor > ind.meta) {
      this.detallePoblacion.municipios[municipio].indicadores[ind.name] = ind.meta;

      this.toast.warning(
        `El valor del indicador "${ind.name}" no puede superar la meta (${ind.meta}).`
      );
    }

    if (valor < 0) {
      this.detallePoblacion.municipios[municipio].indicadores[ind.name] = 0;
    }
  }


  cancel() {
    this.router.navigate(['/dashboard/records']);
  }
}

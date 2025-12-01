import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentModel } from '../../../core/models/component.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { RecordCreateRequest, RecordDetallePoblacion } from '../../../core/models/record.model';

import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { StrategiesService } from '../../../core/services/strategy.service';

import { MUNICIPIOS_VALLE } from '../../../core/data/municipios';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './record-form.html',
  styleUrl: './record-form.css',
})
export class RecordFormComponent {

  municipios = MUNICIPIOS_VALLE;

  today: string = ''; 
  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  attemptedSubmit = false;

  strategies: any[] = [];
  components: ComponentModel[] = [];
  allComponents: ComponentModel[] = [];
  indicators: IndicatorModel[] = [];
  allIndicators: IndicatorModel[] = [];

  // formulario
  form = {
    strategy_id: null as number | null,
    component_id: null as number | null,
    municipio: '',
    fecha: '',
    evidencia_url: '',
  };

  // detalle poblacional dinámico
  detallePoblacion: RecordDetallePoblacion = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {

    this.today = new Date().toISOString().split('T')[0];

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    if (this.isEdit) this.loading = true;

    this.loadStrategies();
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

  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: res => {
        this.allComponents = res;
        if (this.form.strategy_id) this.onStrategyChange();
      },
      error: () => this.toast.error("Error cargando componentes"),
    });
  }

  loadIndicators() {
    this.indicatorsService.getAll().subscribe({
      next: res => this.allIndicators = res,
      error: () => this.toast.error("Error cargando indicadores"),
    });
  }

  // ==========================================================
  // Cargar registro (edición)
  // ==========================================================
  loadRecord() {
    this.recordsService.getById(this.id!).subscribe({
      next: r => {
        this.form.strategy_id = r.strategy_id ?? null;
        this.form.component_id = r.component_id;
        this.form.municipio = r.municipio;
        this.form.fecha = r.fecha;
        this.form.evidencia_url = r.evidencia_url ?? '';

        this.detallePoblacion = r.detalle_poblacion ?? {};

        this.onStrategyChange(false);
        this.onComponentChange(false);

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error("Error cargando registro");
      }
    });
  }

  // ==========================================================
  // Estrategia seleccionada
  // ==========================================================
  onStrategyChange(reset: boolean = true) {
    const strategyId = this.form.strategy_id;

    if (!strategyId) {
      this.components = [];
      this.form.component_id = null;
      this.indicators = [];
      return;
    }

    this.components = this.allComponents.filter(c => c.strategy_id === strategyId);

    if (reset) {
      this.form.component_id = null;
      this.indicators = [];
      this.detallePoblacion = {};
    }
  }

  // ==========================================================
  // Componente seleccionado
  // ==========================================================
  onComponentChange(reset: boolean = true) {
    const compId = this.form.component_id;

    if (!compId) {
      this.indicators = [];
      this.detallePoblacion = {};
      return;
    }

    this.indicators = this.allIndicators.filter(i => i.component_id === compId);

    if (reset) {
      this.detallePoblacion = {};
      this.indicators.forEach(ind => {
        this.detallePoblacion[ind.id] = 0;
      });
    }
  }

  // ==========================================================
  // Payload final
  // ==========================================================
  buildPayload(): RecordCreateRequest {
    return {
      strategy_id: this.form.strategy_id!,
      component_id: this.form.component_id!,
      municipio: this.form.municipio.trim(),
      fecha: this.form.fecha,
      detalle_poblacion: this.detallePoblacion,
      evidencia_url: this.form.evidencia_url || null,
    };
  }

  // ==========================================================
  // Guardar
  // ==========================================================
  save() {
    this.attemptedSubmit = true;

    if (!this.form.strategy_id || !this.form.component_id || !this.form.municipio || !this.form.fecha) {
      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }

    const payload = this.buildPayload();

    // Confirmación si es edición
    if (this.isEdit) {
      this.toast.confirm(
        "¿Guardar cambios?",
        "Se actualizará el registro."
      ).then(result => {
        if (result.isConfirmed) {
          this.sendRequest(payload);
        }
      });
      return;
    }

    this.sendRequest(payload);
  }

  private sendRequest(payload: RecordCreateRequest) {
    this.saving = true;

    const obs = this.isEdit
      ? this.recordsService.update(this.id!, payload)
      : this.recordsService.create(payload);

    obs.subscribe({
      next: () => {
        this.saving = false;

        this.toast.success(
          this.isEdit
            ? "Registro actualizado con éxito"
            : "Registro creado correctamente"
        );

        this.router.navigate(['/dashboard/records']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  get datosGeneralesCompletos() {
    return Boolean(
      this.form.municipio &&
      this.form.fecha &&
      this.form.strategy_id &&
      this.form.component_id
    );
  }

  cancel() {
    this.router.navigate(['/dashboard/records']);
  }

}

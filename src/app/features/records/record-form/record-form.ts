import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { RecordDetallePoblacion, RecordModel, RecordCreateRequest } from '../../../core/models/record.model';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MUNICIPIOS_VALLE } from '../../../core/data/municipios';

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './record-form.html',
  styleUrl: './record-form.css',
})
export class RecordFormComponent {

  municipios = MUNICIPIOS_VALLE

  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  // catálogo
  components: ComponentModel[] = [];
  allIndicators: IndicatorModel[] = [];
  indicators: IndicatorModel[] = [];         // filtrados por componente
  selectedIndicator?: IndicatorModel;

  // formulario base
  form: {
    component_id: number | null;
    indicator_id: number | null;
    municipio: string;
    fecha: string;
    valor: string;
    evidencia_url: string;
  } = {
      component_id: null,
      indicator_id: null,
      municipio: '',
      fecha: '',
      valor: '',
      evidencia_url: '',
    };

  // tipo_poblacion en chips
  tipoPoblacionChips: string[] = [];
  nuevoTipoPoblacion = '';

  // detalle_poblacion
  detallePoblacion: RecordDetallePoblacion = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.loading = true;
    }

    this.loadComponents();
    this.loadIndicators();

    if (this.isEdit) {
      this.loadRecord();
    }
  }

  // -----------------------------
  // Carga de catálogos
  // -----------------------------
  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: (res) => {
        this.components = res;
      },
      error: () => {
        alert('Error cargando componentes');
      },
    });
  }

  loadIndicators() {
    this.indicatorsService.getAll().subscribe({
      next: (res) => {
        this.allIndicators = res;

        // si ya hay componente/indicador cargado (modo edición), ajustamos
        if (this.form.component_id) {
          this.onComponentChange(false);
        }
        if (this.form.indicator_id) {
          this.onIndicatorChange(false);
        }
      },
      error: () => {
        alert('Error cargando indicadores');
      },
    });
  }

  // -----------------------------
  // Cargar registro en modo edición
  // -----------------------------
  loadRecord() {
    this.recordsService.getById(this.id!).subscribe({
      next: (r: RecordModel) => {
        this.form.component_id = r.component_id;
        this.form.indicator_id = r.indicator_id;
        this.form.municipio = r.municipio;
        this.form.fecha = r.fecha;
        this.form.valor = r.valor ?? '';
        this.form.evidencia_url = r.evidencia_url ?? '';

        // tipo_poblacion a chips
        if (Array.isArray(r.tipo_poblacion)) {
          this.tipoPoblacionChips = [...r.tipo_poblacion];
        } else if (r.tipo_poblacion) {
          this.tipoPoblacionChips = [r.tipo_poblacion as unknown as string];
        }

        // detalle_poblacion
        this.detallePoblacion = r.detalle_poblacion ?? {};

        // si ya están los indicadores cargados, filtramos / seleccionamos
        if (this.allIndicators.length) {
          this.onComponentChange(false);
          this.onIndicatorChange(false);
        }

        this.loading = false;
      },
      error: () => {
        alert('Error cargando registro');
        this.loading = false;
      },
    });
  }

  // -----------------------------
  // Cambios de componente / indicador
  // -----------------------------
  onComponentChange(resetIndicator: boolean = true) {
    const compId = this.form.component_id;

    if (!compId) {
      this.indicators = [];
      this.form.indicator_id = null;
      this.selectedIndicator = undefined;
      return;
    }

    // filtrar indicadores según componente
    this.indicators = this.allIndicators.filter(
      (i) => i.component_id === compId
    );

    if (resetIndicator) {
      this.form.indicator_id = null;
      this.selectedIndicator = undefined;
      this.form.valor = '';
      this.detallePoblacion = {};
    } else if (this.form.indicator_id) {
      this.onIndicatorChange(false);
    }
  }

  onIndicatorChange(resetValue: boolean = true) {
    const indId = this.form.indicator_id;
    if (!indId) {
      this.selectedIndicator = undefined;
      return;
    }

    this.selectedIndicator = this.indicators.find((i) => i.id === indId)
      || this.allIndicators.find((i) => i.id === indId);

    if (!this.selectedIndicator) return;

    if (resetValue) {
      this.form.valor = '';
      this.detallePoblacion = {};
    }

    // Si el indicador usa lista y tiene allowed_values, inicializamos detalle_poblacion
    if (this.selectedIndicator.use_list && this.selectedIndicator.allowed_values) {
      const nueva: RecordDetallePoblacion = {};
      this.selectedIndicator.allowed_values.forEach((val) => {
        const actual = this.detallePoblacion[val] ?? 0;
        nueva[val] = actual;
      });
      this.detallePoblacion = nueva;
    }
  }

  // -----------------------------
  // Chips de tipo_poblacion
  // -----------------------------
  addTipoPoblacion() {
    const value = this.nuevoTipoPoblacion.trim();
    if (!value) return;
    if (!this.tipoPoblacionChips.includes(value)) {
      this.tipoPoblacionChips.push(value);
    }
    this.nuevoTipoPoblacion = '';
  }

  removeTipoPoblacion(index: number) {
    this.tipoPoblacionChips.splice(index, 1);
  }

  // -----------------------------
  // Helpers UI
  // -----------------------------
  isBooleanIndicator(): boolean {
    return this.selectedIndicator?.data_type === 'boolean';
  }

  isIntegerIndicator(): boolean {
    return this.selectedIndicator?.data_type === 'integer';
  }

  isDecimalIndicator(): boolean {
    return this.selectedIndicator?.data_type === 'decimal';
  }

  isTextIndicator(): boolean {
    return this.selectedIndicator?.data_type === 'text';
  }

  isDateIndicator(): boolean {
    return this.selectedIndicator?.data_type === 'date';
  }

  isCategoryIndicator(): boolean {
    return this.selectedIndicator?.data_type === 'category';
  }

  hasAllowedValues(): boolean {
    return !!(
      this.selectedIndicator &&
      this.selectedIndicator.allowed_values &&
      this.selectedIndicator.allowed_values.length
    );
  }

  // -----------------------------
  // Construir payload
  // -----------------------------
  buildPayload(): RecordCreateRequest {

    let tipoPoblacion: string[] | string;
    let detalle: RecordDetallePoblacion | null = null;

    if (this.selectedIndicator?.use_list && this.selectedIndicator.allowed_values) {
      // Caso: el indicador define la población
      tipoPoblacion = [...this.selectedIndicator.allowed_values];

      // detalle poblacional es obligatorio en este caso
      detalle = { ...this.detallePoblacion };

    } else {
      // Caso: población definida manualmente por chips

      // Validar mínimo 1 chip
      if (!this.tipoPoblacionChips.length) {
        alert('Debe agregar al menos un tipo de población');
        throw new Error('Invalid form');
      }

      tipoPoblacion =
        this.tipoPoblacionChips.length === 1
          ? this.tipoPoblacionChips[0]
          : this.tipoPoblacionChips;

      // Detalle poblacional no aplica en este modo
      detalle = null;
    }

    return {
      component_id: this.form.component_id!,
      indicator_id: this.form.indicator_id!,
      municipio: this.form.municipio.trim(),
      fecha: this.form.fecha,
      tipo_poblacion: tipoPoblacion,
      detalle_poblacion: detalle,
      valor: this.form.valor ? String(this.form.valor) : null,
      evidencia_url: this.form.evidencia_url || null,
    };
  }

  // -----------------------------
  // Guardar
  // -----------------------------
  save() {
    if (!this.form.component_id || !this.form.indicator_id) {
      alert('Debe seleccionar componente e indicador');
      return;
    }
    if (!this.form.municipio.trim() || !this.form.fecha) {
      alert('Debe completar municipio y fecha');
      return;
    }

    if (!this.selectedIndicator?.use_list) {
      if (!this.tipoPoblacionChips.length) {
        alert('Debe agregar al menos un tipo de población');
        return;
      }
    }
    const payload = this.buildPayload();

    this.saving = true;

    const obs = this.isEdit
      ? this.recordsService.update(this.id!, payload)
      : this.recordsService.create(payload);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard/records']);
      },
      error: () => {
        this.saving = false;
        alert('Error al guardar el registro');
      },
    });
  }

  cancel() {
    this.router.navigate(['/dashboard/records']);
  }
}

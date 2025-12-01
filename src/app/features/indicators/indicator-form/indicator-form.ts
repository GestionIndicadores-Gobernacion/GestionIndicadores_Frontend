import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ComponentModel } from '../../../core/models/component.model';
import { StrategyModel } from '../../../core/models/strategy.model';

import {
  IndicatorModel,
  IndicatorCreateRequest,
  IndicatorUpdateRequest
} from '../../../core/models/indicator.model';

import { ComponentsService } from '../../../core/services/components.service';
import { StrategiesService } from '../../../core/services/strategy.service';
import { IndicatorsService } from '../../../core/services/indicators.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-indicator-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './indicator-form.html',
  styleUrls: ['./indicator-form.css'],
})
export class IndicatorFormComponent {

  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  attemptedSubmit = false;

  strategies: StrategyModel[] = [];
  components: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];

  selectedStrategy: number | '' = '';

  form: IndicatorCreateRequest = {
    component_id: 0,
    name: '',
    description: null,
    data_type: 'integer',
    active: true,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private indicatorsService: IndicatorsService,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.loadStrategies();
    this.loadComponents();

    if (this.isEdit) {
      this.loadIndicator();
    }
  }

  loadStrategies() {
    this.strategiesService.getAll().subscribe({
      next: (res) => (this.strategies = res),
      error: () => this.toast.error('Error al cargar estrategias'),
    });
  }

  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: (res) => {
        this.components = res;

        if (this.isEdit) {
          const comp = this.components.find(c => c.id === this.form.component_id);
          if (comp) {
            this.selectedStrategy = comp.strategy_id;
            this.filterComponents();
          }
        }
      },
      error: () => this.toast.error('Error al cargar componentes'),
    });
  }

  filterComponents() {
    this.filteredComponents = this.components.filter(
      (c) => c.strategy_id === Number(this.selectedStrategy)
    );

    this.form.component_id = 0;
  }

  loadIndicator() {
    this.loading = true;

    this.indicatorsService.getById(this.id!).subscribe({
      next: (data: IndicatorModel) => {
        this.form = {
          component_id: data.component_id,
          name: data.name,
          description: data.description ?? null,
          data_type: data.data_type,
          active: data.active,
        };
        this.loading = false;
      },
      error: () => {
        this.toast.error('Error cargando indicador');
        this.loading = false;
      },
    });
  }

  private cleanUpdate(body: IndicatorUpdateRequest): IndicatorUpdateRequest {
    const clean: any = {};
    for (const key in body) {
      const value = (body as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        clean[key] = value;
      }
    }
    return clean;
  }

  save() {
    this.attemptedSubmit = true;

    // Validación manual (ngModel)
    if (!this.selectedStrategy || !this.form.component_id || !this.form.name || this.form.name.trim().length < 3 || !this.form.data_type) {
      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }

    // Confirmación si es edición
    if (this.isEdit) {
      this.toast.confirm(
        "¿Guardar cambios?",
        "¿Deseas actualizar este indicador?"
      ).then(res => {
        if (res.isConfirmed) {
          this.sendRequest();
        }
      });
      return;
    }

    this.sendRequest();
  }

  private sendRequest() {
    this.saving = true;

    const body: IndicatorCreateRequest = {
      component_id: this.form.component_id,
      name: this.form.name.trim(),
      description: this.form.description?.trim() || null,
      data_type: this.form.data_type,
      active: this.form.active,
    };

    const request$ = this.isEdit
      ? this.indicatorsService.update(
          this.id!,
          this.cleanUpdate({ id: this.id!, ...body })
        )
      : this.indicatorsService.create(body);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(
          this.isEdit
            ? "Indicador actualizado con éxito"
            : "Indicador creado correctamente"
        );
        this.router.navigate(['/dashboard/indicators']);
      },
      error: () => {
        this.saving = false;
      },
    });
  }
}

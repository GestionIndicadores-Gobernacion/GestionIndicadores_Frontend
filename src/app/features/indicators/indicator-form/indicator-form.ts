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
import { forkJoin } from 'rxjs';

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
    meta: 0,
    active: true,
    es_poblacional: false, // 🔥 NUEVO (default seguro)
  };


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private indicatorsService: IndicatorsService,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.loadDataForEdit();
    } else {
      this.loadStrategies();
      this.loadComponents();
    }
  }

  // ============================================================
  // CARGA COMPLETA PARA EDICIÓN (estrategia + componente + indicador)
  // ============================================================
  loadDataForEdit() {
    this.loading = true;

    forkJoin({
      strategies: this.strategiesService.getAll(),
      components: this.componentsService.getAll(),
      indicator: this.indicatorsService.getById(this.id!)
    }).subscribe({
      next: ({ strategies, components, indicator }) => {

        this.strategies = strategies;
        this.components = components;

        // Setear datos del indicador
        this.form = {
          component_id: indicator.component_id,
          name: indicator.name,
          description: indicator.description ?? null,
          data_type: indicator.data_type,
          meta: indicator.meta,
          active: indicator.active,
          es_poblacional: indicator.es_poblacional, // 🔥 NUEVO
        };


        // Encontrar componente → encontrar estrategia
        const comp = components.find(c => c.id === indicator.component_id);

        if (comp) {
          this.selectedStrategy = comp.activity_id;
        }

        // Filtrar componentes de esa estrategia
        this.filteredComponents = components.filter(
          c => c.activity_id === this.selectedStrategy
        );

        this.loading = false;
      },
      error: () => {
        this.toast.error("Error cargando datos del indicador");
        this.loading = false;
      }
    });
  }

  loadStrategies() {
    this.strategiesService.getAll().subscribe({
      next: (res) => (this.strategies = res),
      error: () => this.toast.error('Error al cargar estrategias'),
    });
  }

  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: (res) => (this.components = res),
      error: () => this.toast.error('Error al cargar componentes'),
    });
  }

  // ============================================================
  // FILTRAR COMPONENTES POR ESTRATEGIA
  // ============================================================
  filterComponents() {
    this.filteredComponents = this.components.filter(
      (c) => c.activity_id === Number(this.selectedStrategy)
    );

    // ❗ NO resetear componente si estamos editando
    if (!this.isEdit) {
      this.form.component_id = 0;
    }
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

  // ============================================================
  // GUARDAR
  // ============================================================
  save() {
    this.attemptedSubmit = true;

    if (!this.selectedStrategy ||
      !this.form.component_id ||
      !this.form.name ||
      this.form.name.trim().length < 3 ||
      !this.form.data_type ||
      !this.form.meta || this.form.meta <= 0) {

      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }


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

  // ============================================================
  // ENVÍO REAL (CREAR / ACTUALIZAR)
  // ============================================================
  private sendRequest() {
    this.saving = true;

    const body: IndicatorCreateRequest = {
      component_id: this.form.component_id,
      name: this.form.name.trim(),
      description: this.form.description?.trim() || null,
      data_type: this.form.data_type,
      meta: Number(this.form.meta),  
      active: this.form.active,
      es_poblacional: this.form.es_poblacional ?? false,
    };


    let request$;

    if (this.isEdit) {
      // ❗ NO ENVIAR ID (dump_only)
      const cleanBody = this.cleanUpdate(body);
      console.log("CLEAN UPDATE BODY:", cleanBody);

      request$ = this.indicatorsService.update(
        this.id!,
        cleanBody
      );
    } else {
      request$ = this.indicatorsService.create(body);
    }

    console.log("BODY QUE ENVÍO:", body);

    request$.subscribe({
      next: () => {
        this.saving = false;

        this.toast.success(
          this.isEdit
            ? "Indicador actualizado con éxito"
            : "Indicador creado correctamente"
        );

        this.router.navigate(['/records/indicators']);
      },
      error: (err) => {
        console.error("ERROR REAL DEL BACKEND:", err.error);
        this.saving = false;
      },
    });
  }
}

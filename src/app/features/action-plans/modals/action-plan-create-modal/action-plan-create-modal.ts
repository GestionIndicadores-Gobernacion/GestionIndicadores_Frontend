import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionPlanCreateRequest, ActionPlanObjectiveModel } from '../../../../core/models/action-plan.model';
import { ComponentModel, ComponentObjectiveModel } from '../../../../core/models/component.model';
import { StrategyModel } from '../../../../core/models/strategy.model';
import { ActionPlanService } from '../../../../core/services/action-plan.service';
import { ComponentsService } from '../../../../core/services/components.service';
import { StrategiesService } from '../../../../core/services/strategies.service';

interface ActivityForm {
  name:                     string;
  deliverable:              string;
  delivery_date:            string;
  requires_boss_assistance: boolean;
  support_staff:            { name: string }[];
}

interface ObjectiveForm {
  // Para objetivos del componente: se elige del select
  objective_id:   number | null;
  // Para objetivos nuevos: se escribe texto libre
  objective_text: string;
  // Indica si es un objetivo nuevo (texto libre) o del componente
  isNew:          boolean;
  activities:     ActivityForm[];
}

@Component({
  selector: 'app-action-plan-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './action-plan-create-modal.html',
  styleUrl: './action-plan-create-modal.css',
})
export class ActionPlanCreateModalComponent implements OnInit {

  @Output() close   = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  // ═══════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════

  strategies:         StrategyModel[]          = [];
  components:         ComponentModel[]          = [];
  filteredComponents: ComponentModel[]          = [];
  objectives:         ComponentObjectiveModel[] = [];

  loading = false;
  saving  = false;
  errors: Record<string, string> = {};

  // ═══════════════════════════════════════
  // FORM
  // ═══════════════════════════════════════

  form: {
    strategy_id:     number;
    component_id:    number;
    responsible:     string;
    plan_objectives: ObjectiveForm[];
  } = {
    strategy_id:     0,
    component_id:    0,
    responsible:     '',
    plan_objectives: [],
  };

  constructor(
    private actionPlanService: ActionPlanService,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.strategiesService.getAll().subscribe({
      next: s => { this.strategies = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.componentsService.getAll().subscribe({
      next: c => { this.components = c; }
    });
  }

  // ═══════════════════════════════════════
  // SELECTS ENCADENADOS
  // ═══════════════════════════════════════

  onStrategyChange(): void {
    this.form.component_id = 0;
    this.objectives        = [];
    this.form.plan_objectives = [];
    this.filteredComponents = this.form.strategy_id
      ? this.components.filter(c => c.strategy_id === +this.form.strategy_id)
      : [];
  }

  onComponentChange(): void {
    this.objectives = [];
    this.form.plan_objectives = [];
    if (!this.form.component_id || +this.form.component_id === 0) return;

    this.componentsService.getById(+this.form.component_id).subscribe({
      next: detail => {
        this.objectives = detail.objectives ?? [];
        // Auto-agregar el primer objetivo del componente obligatoriamente
        if (this.objectives.length > 0) {
          this.form.plan_objectives = [{
            objective_id:   this.objectives[0].id ?? null,
            objective_text: '',
            isNew:          false,
            activities:     [this.newActivity()],
          }];
        }
      }
    });
  }

  // ═══════════════════════════════════════
  // OBJETIVOS
  // ═══════════════════════════════════════

  addObjectiveFromComponent(): void {
    const next = this.nextAvailableObjective;
    if (!next) return;
    this.form.plan_objectives.push({
      objective_id:   next.id ?? null,
      objective_text: '',
      isNew:          false,
      activities:     [this.newActivity()],
    });
  }

  addNewObjective(): void {
    this.form.plan_objectives.push({
      objective_id:   null,
      objective_text: '',
      isNew:          true,
      activities:     [this.newActivity()],
    });
  }

  removeObjective(index: number): void {
    if (this.form.plan_objectives.length === 1) return;
    this.form.plan_objectives.splice(index, 1);
  }

  objectiveLabel(obj: ObjectiveForm): string {
    if (obj.isNew) return obj.objective_text || 'Nuevo objetivo';
    const found = this.objectives.find(o => o.id === +obj.objective_id!);
    return found ? found.description : 'Objetivo del componente';
  }

  // ═══════════════════════════════════════
  // ACTIVIDADES
  // ═══════════════════════════════════════

  private newActivity(): ActivityForm {
    return {
      name:                     '',
      deliverable:              '',
      delivery_date:            '',
      requires_boss_assistance: false,
      support_staff:            [],
    };
  }

  addActivity(objIndex: number): void {
    this.form.plan_objectives[objIndex].activities.push(this.newActivity());
  }

  removeActivity(objIndex: number, actIndex: number): void {
    const acts = this.form.plan_objectives[objIndex].activities;
    if (acts.length === 1) return;
    acts.splice(actIndex, 1);
  }

  addStaff(objIndex: number, actIndex: number): void {
    this.form.plan_objectives[objIndex].activities[actIndex].support_staff.push({ name: '' });
  }

  removeStaff(objIndex: number, actIndex: number, staffIndex: number): void {
    this.form.plan_objectives[objIndex].activities[actIndex].support_staff.splice(staffIndex, 1);
  }

  trackByIndex(index: number): number { return index; }

  /** Verdadero si quedan objetivos del componente que aún no están en el plan */
  get hasAvailableComponentObjectives(): boolean {
    if (!this.objectives.length) return false;
    const usedIds = new Set(
      this.form.plan_objectives
        .filter(o => !o.isNew && o.objective_id !== null)
        .map(o => +o.objective_id!)
    );
    return this.objectives.some(o => !usedIds.has(o.id!));
  }

  /** Próximo objetivo del componente que no esté ya en el plan */
  get nextAvailableObjective(): ComponentObjectiveModel | null {
    const usedIds = new Set(
      this.form.plan_objectives
        .filter(o => !o.isNew && o.objective_id !== null)
        .map(o => +o.objective_id!)
    );
    return this.objectives.find(o => !usedIds.has(o.id!)) ?? null;
  }

  // ═══════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════

  submit(): void {
    this.errors = {};

    if (!this.form.strategy_id || +this.form.strategy_id === 0) {
      this.errors['strategy_id'] = 'Debes seleccionar una estrategia.';
    }
    if (!this.form.component_id || +this.form.component_id === 0) {
      this.errors['component_id'] = 'Debes seleccionar un componente.';
    }
    if (this.form.plan_objectives.length === 0) {
      this.errors['plan_objectives'] = 'Debes tener al menos un objetivo.';
    }

    // Validar que objetivos nuevos tengan texto
    const missingText = this.form.plan_objectives.some(o => o.isNew && !o.objective_text.trim());
    if (missingText) {
      this.errors['plan_objectives'] = 'Los objetivos nuevos deben tener descripción.';
    }

    // Validar actividades
    for (const obj of this.form.plan_objectives) {
      if (obj.activities.some(a => !a.name.trim())) {
        this.errors['activities'] = 'Todas las actividades deben tener nombre.';
      }
      if (obj.activities.some(a => !a.deliverable.trim())) {
        this.errors['activities'] = 'Todas las actividades deben tener entregable.';
      }
      if (obj.activities.some(a => !a.delivery_date)) {
        this.errors['activities'] = 'Todas las actividades deben tener fecha de entrega.';
      }
    }

    if (Object.keys(this.errors).length > 0) return;

    const payload: ActionPlanCreateRequest = {
      strategy_id:  +this.form.strategy_id,
      component_id: +this.form.component_id,
      responsible:  this.form.responsible.trim() || null,
      plan_objectives: this.form.plan_objectives.map(obj => ({
        objective_id:   obj.isNew ? null : (obj.objective_id ? +obj.objective_id : null),
        objective_text: obj.isNew ? obj.objective_text.trim() : null,
        activities: obj.activities.map(a => ({
          name:                     a.name.trim(),
          deliverable:              a.deliverable.trim(),
          delivery_date:            a.delivery_date,
          requires_boss_assistance: a.requires_boss_assistance,
          support_staff: a.support_staff
            .filter(s => s.name.trim())
            .map(s => ({ name: s.name.trim() })),
        })),
      })),
    };

    this.saving = true;
    this.actionPlanService.create(payload).subscribe({
      next: () => { this.saving = false; this.created.emit(); },
      error: (err) => {
        this.saving = false;
        if (err?.error?.errors) this.errors = err.error.errors;
      }
    });
  }

  onClose(): void { this.close.emit(); }
}
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ActionPlanCreateRequest, RecurrenceFrequency } from '../../../../core/models/action-plan.model';
import { ComponentModel, ComponentObjectiveModel } from '../../../../core/models/component.model';
import { StrategyModel } from '../../../../core/models/strategy.model';
import { UserResponse } from '../../../../core/models/user.model';
import { ActionPlanService } from '../../../../core/services/action-plan.service';
import { ComponentsService } from '../../../../core/services/components.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { UsersService } from '../../../../core/services/users.service';
import { ActivityFormData, ActionPlanActivityFormComponent } from './action-plan-activity-form/action-plan-activity-form';
import { MUNICIPIOS_VALLE } from '../../../../core/data/municipios';

const EXCLUDED_EMAILS = new Set([
  'admin@gobernacion.gov.co',
  'publico@indicadorespyba.cloud',
  'editor@gobernacion.gov.co',
  'viewer@gobernacion.gov.co',
  'monitor@gmail.com',
]);

interface ObjectiveForm {
  objective_id: number | null;
  objective_text: string;
  isNew: boolean;
  activities: ActivityFormData[];
}

@Component({
  selector: 'app-action-plan-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionPlanActivityFormComponent],
  templateUrl: './action-plan-create-modal.html',
  styleUrl: './action-plan-create-modal.css',
})
export class ActionPlanCreateModalComponent implements OnInit {

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  strategies: StrategyModel[] = [];
  components: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];
  objectives: ComponentObjectiveModel[] = [];
  users: UserResponse[] = [];          // ← lista filtrada (sin admin)

  loading = true;
  saving = false;
  errors: Record<string, string> = {};

  private currentUser: any = null;

  municipios = MUNICIPIOS_VALLE;

  form: {
    strategy_id: number;
    component_id: number;
    responsible_user_id: number | null;
    plan_objectives: ObjectiveForm[];
  } = {
      strategy_id: 0,
      component_id: 0,
      responsible_user_id: null,
      plan_objectives: []
    };

  constructor(
    private actionPlanService: ActionPlanService,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') ?? 'null');

    forkJoin({
      strategies: this.strategiesService.getAll(),
      components: this.componentsService.getAll(),
      users: this.usersService.getAll(),
    }).subscribe({
      next: ({ strategies, components, users }) => {
        this.users = users.filter(u => !EXCLUDED_EMAILS.has(u.email));

        const role = this.currentUser?.role?.name;

        if (role === 'editor') {
          const assigned: number[] = (this.currentUser?.component_assignments ?? [])
            .map((c: any) => c.component_id);

          // Solo componentes asignados
          const allowedComponents = components.filter(c => assigned.includes(c.id));

          // Solo estrategias que tengan al menos un componente asignado
          const allowedStrategyIds = new Set(allowedComponents.map(c => c.strategy_id));
          this.strategies = strategies.filter(s => allowedStrategyIds.has(s.id));
          this.components = allowedComponents;
        } else {
          // Admin/monitor ven todo
          this.strategies = strategies;
          this.components = components;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  /** Nombre completo para mostrar en el select */
  userDisplayName(user: UserResponse): string {
    return `${user.first_name} ${user.last_name}`.trim();
  }

  /**
   * Dado un nombre libre (planes ya creados con texto plano),
   * intenta encontrar el usuario cuyo nombre completo coincida.
   * Útil si en un futuro editas planes existentes.
   */
  matchUserByName(name: string): UserResponse | undefined {
    if (!name) return undefined;
    const normalized = name.trim().toLowerCase();
    return this.users.find(u =>
      this.userDisplayName(u).toLowerCase() === normalized
    );
  }

  // ── Estrategia / Componente ──────────────────────────────────────

  onStrategyChange(): void {
    this.form.component_id = 0;
    this.objectives = [];
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
        if (this.objectives.length > 0) {
          this.form.plan_objectives = [{
            objective_id: this.objectives[0].id ?? null,
            objective_text: '', isNew: false,
            activities: [this.newActivity()],
          }];
        }
        this.cdr.detectChanges();
      }
    });
  }

  // ── Objetivos ────────────────────────────────────────────────────

  addObjectiveFromComponent(): void {
    const next = this.nextAvailableObjective;
    if (!next) return;
    this.form.plan_objectives.push({
      objective_id: next.id ?? null, objective_text: '', isNew: false,
      activities: [this.newActivity()],
    });
  }

  addNewObjective(): void {
    this.form.plan_objectives.push({
      objective_id: null, objective_text: '', isNew: true,
      activities: [this.newActivity()],
    });
  }

  removeObjective(i: number): void {
    if (this.form.plan_objectives.length > 1) this.form.plan_objectives.splice(i, 1);
  }

  // ── Actividades ──────────────────────────────────────────────────

  private defaultUntil(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }

  private newActivity(): ActivityFormData {
    return {
      name: '',
      deliverable: '',
      delivery_date: '',
      lugar: null,   // ← FALTABA
      requires_boss_assistance: false,
      generates_report: false,
      support_staff: [],
      recurrence: {
        enabled: false,
        frequency: 'monthly' as RecurrenceFrequency,
        until: this.defaultUntil(),
        day_of_month: null,
        day_of_week: null,
        interval: 7,
      },
    };
  }

  addActivity(oi: number): void {
    this.form.plan_objectives[oi].activities.push(this.newActivity());
  }

  removeActivity(oi: number, ai: number): void {
    const acts = this.form.plan_objectives[oi].activities;
    if (acts.length > 1) acts.splice(ai, 1);
  }

  addStaff(oi: number, ai: number): void {
    this.form.plan_objectives[oi].activities[ai].support_staff.push({ name: '' });
  }

  removeStaff(oi: number, ai: number, si: number): void {
    this.form.plan_objectives[oi].activities[ai].support_staff.splice(si, 1);
  }

  trackByIndex(i: number): number { return i; }

  get hasAvailableComponentObjectives(): boolean {
    if (!this.objectives.length) return false;
    const used = new Set(this.form.plan_objectives.filter(o => !o.isNew && o.objective_id !== null).map(o => +o.objective_id!));
    return this.objectives.some(o => !used.has(o.id!));
  }

  get nextAvailableObjective(): ComponentObjectiveModel | null {
    const used = new Set(this.form.plan_objectives.filter(o => !o.isNew && o.objective_id !== null).map(o => +o.objective_id!));
    return this.objectives.find(o => !used.has(o.id!)) ?? null;
  }

  // ── Submit ───────────────────────────────────────────────────────

  submit(): void {
    this.errors = {};

    if (!+this.form.strategy_id) this.errors['strategy_id'] = 'Debes seleccionar una estrategia.';
    if (!+this.form.component_id) this.errors['component_id'] = 'Debes seleccionar un componente.';
    if (!this.form.responsible_user_id) this.errors['responsible_user_id'] = 'Debes asignar un responsable.';
    if (!this.form.plan_objectives.length) this.errors['plan_objectives'] = 'Debes tener al menos un objetivo.';
    if (this.form.plan_objectives.some(o => o.isNew && !o.objective_text.trim()))
      this.errors['plan_objectives'] = 'Los objetivos nuevos deben tener descripción.';
    if (this.form.plan_objectives.some(o => !o.isNew && !o.objective_id))
      this.errors['plan_objectives'] = 'Debes seleccionar un objetivo para cada entrada.';

    if (this.form.plan_objectives.some(o => !o.isNew && !o.objective_id))
      this.errors['plan_objectives'] = 'Todos los objetivos deben estar seleccionados.';

    for (const obj of this.form.plan_objectives) {
      if (obj.activities.some(a => !a.name.trim())) this.errors['activities'] = 'Todas las actividades deben tener nombre.';
      if (obj.activities.some(a => !a.deliverable.trim())) this.errors['activities'] = 'Todas las actividades deben tener entregable.';
      if (obj.activities.some(a => !a.delivery_date)) this.errors['activities'] = 'Todas las actividades deben tener fecha de entrega.';
      if (obj.activities.some(a => a.recurrence.enabled && !a.recurrence.until))
        this.errors['activities'] = 'Las actividades recurrentes deben tener fecha límite.';
    }

    if (Object.keys(this.errors).length) return;

    // Resolver nombre del responsable a partir del usuario seleccionado
    const selectedUser = this.users.find(u => u.id === this.form.responsible_user_id) ?? null;

    const payload: ActionPlanCreateRequest = {
      strategy_id: +this.form.strategy_id,
      component_id: +this.form.component_id,
      // Se envía el nombre completo igual que antes (compatibilidad con backend)
      responsible: selectedUser ? this.userDisplayName(selectedUser) : null,
      responsible_user_id: this.form.responsible_user_id,
      plan_objectives: this.form.plan_objectives.map(obj => ({
        objective_id: obj.isNew ? null : (obj.objective_id ? +obj.objective_id : null),
        objective_text: obj.isNew ? obj.objective_text.trim() : null,
        activities: obj.activities.map(a => ({
          name: a.name.trim(), deliverable: a.deliverable.trim(),
          delivery_date: a.delivery_date,
          lugar: a.lugar,
          requires_boss_assistance: a.requires_boss_assistance,
          generates_report: a.generates_report,
          support_staff: a.support_staff.filter(s => s.name.trim()).map(s => ({ name: s.name.trim() })),
          recurrence: a.recurrence.enabled ? {
            frequency: a.recurrence.frequency,
            until: a.recurrence.until,
            day_of_month: a.recurrence.frequency === 'monthly' ? a.recurrence.day_of_month : null,
            day_of_week: ['weekly', 'biweekly'].includes(a.recurrence.frequency) ? a.recurrence.day_of_week : null,
            interval: a.recurrence.frequency === 'custom' ? a.recurrence.interval : null,
          } : null,
        })),
      })),
    };

    this.saving = true;
    this.actionPlanService.create(payload).subscribe({
      next: () => { this.saving = false; this.created.emit(); },
      error: (err) => { this.saving = false; if (err?.error?.errors) this.errors = err.error.errors; this.cdr.detectChanges(); }
    });
  }

  onClose(): void { this.close.emit(); }
}
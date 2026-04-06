import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ActionPlanModel, RecurrenceFrequency } from '../../../../../../core/models/action-plan.model';
import { ComponentObjectiveModel } from '../../../../../../core/models/component.model';
import { UserResponse } from '../../../../../../core/models/user.model';
import { ActionPlanService } from '../../../../../../core/services/action-plan.service';
import { ComponentsService } from '../../../../../../core/services/components.service';
import { UsersService } from '../../../../../../core/services/users.service';
import { ActivityFormData, ActionPlanActivityFormComponent } from '../../action-plan-activity-form/action-plan-activity-form';
import { MUNICIPIOS_VALLE } from '../../../../../../core/data/municipios';


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
  selector: 'app-action-plan-edit-plan-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionPlanActivityFormComponent],
  templateUrl: './action-plan-edit-plan-modal.html',
})
export class ActionPlanEditPlanModalComponent implements OnInit {

  @Input() plan!: ActionPlanModel;
  @Output() close = new EventEmitter<void>();
  @Output() edited = new EventEmitter<void>();

  users: UserResponse[] = [];
  objectives: ComponentObjectiveModel[] = [];

  loading = true;
  saving = false;
  errors: Record<string, string> = {};

  municipios = MUNICIPIOS_VALLE;

  legacyResponsible: string | null = null;

  form: {
    responsible_user_id: number | null;
    plan_objectives: ObjectiveForm[];
  } = {
      responsible_user_id: null,
      plan_objectives: []
    };

  constructor(
    private actionPlanService: ActionPlanService,
    private componentsService: ComponentsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    forkJoin({
      users: this.usersService.getAll(),
      component: this.componentsService.getById(this.plan.component_id),
    }).subscribe({
      next: ({ users, component }) => {
        this.users = users.filter(u => !EXCLUDED_EMAILS.has(u.email));
        this.objectives = component.objectives ?? [];

        const responsibleName = this.plan.responsible?.trim() ?? '';

        const matched = this.users.find(u =>
          `${u.first_name} ${u.last_name}`.trim().toLowerCase() === responsibleName.toLowerCase()
        );

        if (matched) {
          this.form.responsible_user_id = matched.id;
        } else {
          this.form.responsible_user_id = null;
          this.legacyResponsible = responsibleName;
        }

        // Precargar objetivos y actividades
        this.form.plan_objectives = (this.plan.plan_objectives ?? []).map(obj => ({
          objective_id: obj.objective_id ?? null,
          objective_text: obj.objective_text ?? '',
          isNew: !obj.objective_id,
          activities: (obj.activities ?? [])
            .filter(a => a.status !== 'Realizado')
            .map(a => ({
              name: a.name,
              deliverable: a.deliverable,
              delivery_date: a.delivery_date,
              lugar: a.lugar ?? null,   // ← FALTABA
              requires_boss_assistance: a.requires_boss_assistance ?? false,
              support_staff: (a.support_staff ?? []).map(s => ({ name: s.name })),
              recurrence: {
                enabled: false,
                frequency: (a.recurrence_rule?.frequency ?? 'monthly') as RecurrenceFrequency,
                until: a.recurrence_rule?.until ?? this.defaultUntil(),
                day_of_month: a.recurrence_rule?.day_of_month ?? null,
                day_of_week: a.recurrence_rule?.day_of_week ?? null,
                interval: a.recurrence_rule?.interval ?? 7,
              },
            })),
        })).filter(obj => obj.activities.length > 0);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  private defaultUntil(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }

  private newActivity(): ActivityFormData {
    return {
      name: '', deliverable: '', delivery_date: '',
      lugar: null,                    // ← agregar
      requires_boss_assistance: false, support_staff: [],
      recurrence: {
        enabled: false, frequency: 'monthly' as RecurrenceFrequency,
        until: this.defaultUntil(), day_of_month: null, day_of_week: null, interval: 7,
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

  userDisplayName(u: UserResponse): string {
    return `${u.first_name} ${u.last_name}`.trim();
  }

  submit(): void {
    this.errors = {};

    if (!this.form.responsible_user_id)
      this.errors['responsible'] = 'Debes asignar un responsable.';
    if (!this.form.plan_objectives.length)
      this.errors['objectives'] = 'Debe haber al menos un objetivo con actividades.';
    for (const obj of this.form.plan_objectives) {
      if (obj.activities.some(a => !a.name.trim()))
        this.errors['activities'] = 'Todas las actividades deben tener nombre.';
      if (obj.activities.some(a => !a.deliverable.trim()))
        this.errors['activities'] = 'Todas las actividades deben tener entregable.';
      if (obj.activities.some(a => !a.delivery_date))
        this.errors['activities'] = 'Todas las actividades deben tener fecha de entrega.';
    }

    if (Object.keys(this.errors).length) return;

    const selectedUser = this.users.find(u => u.id === this.form.responsible_user_id) ?? null;

    const payload = {
      responsible: selectedUser ? this.userDisplayName(selectedUser) : null,
      responsible_user_id: this.form.responsible_user_id,
      plan_objectives: this.form.plan_objectives.map(obj => ({
        objective_id: obj.isNew ? null : obj.objective_id,
        objective_text: obj.isNew ? obj.objective_text.trim() : null,
        activities: obj.activities.map(a => ({
          name: a.name.trim(),
          deliverable: a.deliverable.trim(),
          delivery_date: a.delivery_date,
          lugar: a.lugar,
          requires_boss_assistance: a.requires_boss_assistance,
          support_staff: a.support_staff.filter(s => s.name.trim()),
        })),
      })),
    };

    this.saving = true;
    this.actionPlanService.updatePlan(this.plan.id, payload).subscribe({
      next: () => { this.saving = false; this.edited.emit(); },
      error: (err) => {
        this.saving = false;
        this.errors['general'] = err?.error?.message ?? 'Error al guardar.';
        this.cdr.detectChanges();
      }
    });
  }

  objectiveLabel(objectiveId: number | null): string {
    if (!objectiveId) return '';
    const obj = this.objectives.find(o => o.id === objectiveId);
    return obj?.description ?? '';
  }

  onClose(): void { this.close.emit(); }
}
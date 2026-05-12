import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActionPlanActivityModel, ActionPlanModel, ActionPlanObjectiveModel, RecurrenceFrequency } from '../../../../../../features/action-plans/models/action-plan.model';
import { ComponentObjectiveModel } from '../../../../../../features/report/models/component.model';
import { UserResponse } from '../../../../../../features/user/models/user.model';
import { ActionPlanService } from '../../../../../../features/action-plans/services/action-plan.service';
import { ComponentsService } from '../../../../../../features/report/services/components.service';
import { UsersService } from '../../../../../../features/user/services/users.service';
import { ActivityFormData, ActionPlanActivityFormComponent } from '../../action-plan-activity-form/action-plan-activity-form';
import { MUNICIPIOS_VALLE } from '../../../../../../core/data/municipios';
import { LucideAngularModule } from 'lucide-angular';


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
  imports: [CommonModule, FormsModule, ActionPlanActivityFormComponent, LucideAngularModule],
  templateUrl: './action-plan-edit-plan-modal.html',
})
export class ActionPlanEditPlanModalComponent implements OnInit {

  @Input() plan!: ActionPlanModel;
  @Input() currentUser: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() edited = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  showDeleteConfirm = false;
  deleteMode: 'menu' | 'choose-activities' = 'menu';
  selectedActivityIds = new Set<number>();
  deleting = false;
  deleteError: string | null = null;

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

  private destroyRef = inject(DestroyRef);

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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
              generates_report: a.generates_report ?? false,
              support_staff: (a.support_staff ?? []).map(s => ({ name: s.name, user_id: s.user_id ?? null })),
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
      generates_report: false,
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
    this.form.plan_objectives[oi].activities[ai].support_staff.push({ name: '', user_id: null });
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
    this.actionPlanService.updatePlan(this.plan.id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  // ─────────────────────────────────────────────
  // ELIMINAR PLAN / ACTIVIDADES
  // ─────────────────────────────────────────────

  /** Admin o creador del plan pueden eliminar. Viewer nunca. */
  canDeletePlan(): boolean {
    if (!this.currentUser) return false;
    const role = this.currentUser.role?.name;
    if (role === 'admin') return true;
    if (role === 'viewer') return false;
    return this.plan?.user_id != null && this.plan.user_id === this.currentUser.id;
  }

  /** Lista plana de todas las actividades del plan, con su objetivo asociado. */
  get allActivities(): { activity: ActionPlanActivityModel; objective: ActionPlanObjectiveModel }[] {
    const out: { activity: ActionPlanActivityModel; objective: ActionPlanObjectiveModel }[] = [];
    for (const obj of this.plan?.plan_objectives ?? []) {
      for (const act of obj.activities ?? []) {
        if (act.id != null) out.push({ activity: act, objective: obj });
      }
    }
    return out;
  }

  get totalActivities(): number {
    return this.allActivities.length;
  }

  get reportedActivities(): number {
    return this.allActivities.filter(x => !!x.activity.reported_at).length;
  }

  openDeleteConfirm(): void {
    this.deleteMode = 'menu';
    this.selectedActivityIds.clear();
    this.deleteError = null;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    if (this.deleting) return;
    this.showDeleteConfirm = false;
    this.deleteMode = 'menu';
    this.selectedActivityIds.clear();
    this.deleteError = null;
  }

  goChooseActivities(): void {
    this.deleteMode = 'choose-activities';
    this.selectedActivityIds.clear();
    this.deleteError = null;
  }

  backToMenu(): void {
    this.deleteMode = 'menu';
    this.selectedActivityIds.clear();
    this.deleteError = null;
  }

  toggleActivitySelection(id: number): void {
    if (this.selectedActivityIds.has(id)) this.selectedActivityIds.delete(id);
    else this.selectedActivityIds.add(id);
  }

  isActivitySelected(id: number): boolean {
    return this.selectedActivityIds.has(id);
  }

  confirmDeletePlan(): void {
    if (this.deleting) return;
    this.deleting = true;
    this.deleteError = null;
    this.actionPlanService.delete(this.plan.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.deleted.emit();
      },
      error: (err) => {
        this.deleting = false;
        this.deleteError = err?.error?.error ?? err?.error?.message ?? 'No se pudo eliminar el plan.';
        this.cdr.detectChanges();
      }
    });
  }

  confirmDeleteSelectedActivities(): void {
    if (this.deleting || this.selectedActivityIds.size === 0) return;
    this.deleting = true;
    this.deleteError = null;
    const ids = Array.from(this.selectedActivityIds);
    const calls = ids.map(id =>
      this.actionPlanService.deleteActivity(id).pipe(
        map(() => ({ id, ok: true as const })),
        catchError((err) => of({ id, ok: false as const, err }))
      )
    );
    forkJoin(calls).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(results => {
      this.deleting = false;
      const failed = results.filter(r => !r.ok);
      if (failed.length === 0) {
        this.showDeleteConfirm = false;
        this.deleted.emit();
      } else {
        this.deleteError = `No se pudieron eliminar ${failed.length} de ${ids.length} actividades.`;
        // Si al menos una se borró, refrescar el padre igual al cerrar.
        if (failed.length < ids.length) this.deleted.emit();
        this.cdr.detectChanges();
      }
    });
  }
}
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActionPlanActivityModel, ActionPlanModel, ActionPlanObjectiveModel, RecurrenceFrequency } from '../../../../../../features/action-plans/models/action-plan.model';
import { ComponentObjectiveModel, ComponentModel } from '../../../../../../features/report/models/component.model';
import { UserResponse } from '../../../../../../features/user/models/user.model';
import { ActionPlanService } from '../../../../../../features/action-plans/services/action-plan.service';
import { ComponentsService } from '../../../../../../features/report/services/components.service';
import { UsersService } from '../../../../../../features/user/services/users.service';
import { DatasetService } from '../../../../../../features/datasets/services/datasets.service';
import { ActivityFormData, ActionPlanActivityFormComponent } from '../../action-plan-activity-form/action-plan-activity-form';
import { MUNICIPIOS_VALLE } from '../../../../../../core/data/municipios';
import { AuthService } from '../../../../../../core/services/auth.service';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { PERMS, ROLE_IDS } from '../../../../../../core/constants/permissions';
import { LucideAngularModule } from 'lucide-angular';


const PROMOTORES_PYBA_DATASET_NAME = 'PERSONAS PROMOTORES PYBA';
const PROMOTORES_PYBA_COMPONENT_HINT = 'PROMOTORES PYBA';

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
  component: ComponentModel | null = null;

  /** Personas del dataset PROMOTORES PYBA — sólo si el componente lo requiere. */
  datasetPersons: { name: string }[] = [];
  loadingDatasetPersons = false;
  datasetPersonsError = '';

  loading = true;
  saving = false;
  errors: Record<string, string> = {};

  municipios = MUNICIPIOS_VALLE;

  /** Nombres del responsable original que no se pudieron resolver ni contra
   *  users del sistema ni contra el dataset (planes legacy / dataset cambió). */
  legacyResponsibles: string[] = [];

  form: {
    responsible_user_ids: number[];
    responsible_dataset_names: string[];
    plan_objectives: ObjectiveForm[];
  } = {
      responsible_user_ids: [],
      responsible_dataset_names: [],
      plan_objectives: []
    };

  private destroyRef = inject(DestroyRef);

  constructor(
    private actionPlanService: ActionPlanService,
    private componentsService: ComponentsService,
    private usersService: UsersService,
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private permissionService: PermissionService
  ) { }

  /** True si el componente del plan es "Promotores PYBA". */
  get isPromotoresComponent(): boolean {
    return ((this.component?.name) || '').toUpperCase().includes(PROMOTORES_PYBA_COMPONENT_HINT);
  }

  ngOnInit(): void {
    // Cargamos users filtrados por componente (mismo criterio que el create
    // modal) + el componente para detectar si es Promotores PYBA.
    forkJoin({
      users: this.usersService.getAll(this.plan.component_id),
      component: this.componentsService.getById(this.plan.component_id),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ users, component }) => {
        this.users = users.filter(u => !u.email || !EXCLUDED_EMAILS.has(u.email));
        this.objectives = component.objectives ?? [];
        this.component = component;

        // Continuamos con la pre-carga del responsable. Si el componente
        // es Promotores PYBA cargamos el dataset y luego resolvemos.
        if (this.isPromotoresComponent) {
          this.loadPromotoresDatasetThen(() => this.hydrateResponsibles());
        } else {
          this.hydrateResponsibles();
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

  // ── Toggles de responsable (users del sistema) ───────────────────
  toggleResponsible(userId: number): void {
    const idx = this.form.responsible_user_ids.indexOf(userId);
    if (idx === -1) this.form.responsible_user_ids.push(userId);
    else this.form.responsible_user_ids.splice(idx, 1);
  }
  isResponsibleSelected(userId: number): boolean {
    return this.form.responsible_user_ids.includes(userId);
  }
  getUserName(userId: number): string {
    const u = this.users.find(x => x.id === userId);
    return u ? this.userDisplayName(u) : String(userId);
  }

  // ── Toggles de responsable (personas del dataset Promotores) ─────
  toggleDatasetResponsible(name: string): void {
    const idx = this.form.responsible_dataset_names.indexOf(name);
    if (idx === -1) this.form.responsible_dataset_names.push(name);
    else this.form.responsible_dataset_names.splice(idx, 1);
  }
  isDatasetResponsibleSelected(name: string): boolean {
    return this.form.responsible_dataset_names.includes(name);
  }

  // ── Pre-carga: resuelve plan.responsible_user_ids + plan.responsible ──
  private hydrateResponsibles(): void {
    // 1. Pre-cargar IDs relacionales (cuando el backend los emite).
    const ids = (this.plan.responsible_user_ids ?? [])
      .filter(id => this.users.some(u => u.id === id));
    this.form.responsible_user_ids = [...ids];

    // 2. Parsear el string `responsible` (formato "Nombre1, Nombre2").
    //    Para cada nombre que NO esté ya cubierto por IDs relacionales,
    //    intentamos resolver primero contra users del sistema (por nombre
    //    completo), luego contra el dataset. Si no hay match, queda como
    //    legacy display.
    const raw = (this.plan.responsible ?? '').split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const idNamesLower = new Set(
      this.form.responsible_user_ids
        .map(id => this.users.find(u => u.id === id))
        .filter((u): u is UserResponse => !!u)
        .map(u => this.userDisplayName(u).toLowerCase()),
    );

    const legacy: string[] = [];
    for (const name of raw) {
      const lower = name.toLowerCase();
      if (idNamesLower.has(lower)) continue;
      const userMatch = this.users.find(u => this.userDisplayName(u).toLowerCase() === lower);
      if (userMatch) {
        if (!this.form.responsible_user_ids.includes(userMatch.id)) {
          this.form.responsible_user_ids.push(userMatch.id);
        }
        continue;
      }
      const datasetMatch = this.datasetPersons.find(p => p.name.toLowerCase() === lower);
      if (datasetMatch) {
        if (!this.form.responsible_dataset_names.includes(datasetMatch.name)) {
          this.form.responsible_dataset_names.push(datasetMatch.name);
        }
        continue;
      }
      legacy.push(name);
    }
    this.legacyResponsibles = legacy;
    this.cdr.detectChanges();
  }

  // ── Carga del dataset Promotores PYBA ─────────────────────────────
  private loadPromotoresDatasetThen(after: () => void): void {
    this.loadingDatasetPersons = true;
    this.datasetService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: datasets => {
        const target = (datasets || []).find(d =>
          d.active && (d.name || '').toUpperCase().trim() === PROMOTORES_PYBA_DATASET_NAME
        );
        if (!target) {
          this.loadingDatasetPersons = false;
          after();
          return;
        }
        this.datasetService.getRecordsByDataset(target.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: rows => {
              this.datasetPersons = this.extractPersonNames(rows || []);
              this.loadingDatasetPersons = false;
              after();
            },
            error: () => {
              this.datasetPersons = [];
              this.datasetPersonsError = 'No se pudo cargar el dataset de Promotores PYBA.';
              this.loadingDatasetPersons = false;
              after();
            }
          });
      },
      error: () => {
        this.datasetPersonsError = 'No se pudo consultar los datasets disponibles.';
        this.loadingDatasetPersons = false;
        after();
      }
    });
  }

  /** Extrae nombres únicos del dataset (replica el algoritmo del create modal). */
  private extractPersonNames(rows: { id: number; data: any }[]): { name: string }[] {
    const detectField = (rs: { data: any }[]): string | null => {
      if (!rs.length) return null;
      const allKeys = new Set<string>();
      for (const r of rs) Object.keys(r?.data || {}).forEach(k => allKeys.add(k));
      const EXACT = ['nombres_y_apellidos', 'nombre_completo', 'nombre_y_apellido',
        'nombre_completo_del_promotor', 'nombre_del_promotor', 'nombre', 'nombres'];
      for (const c of EXACT) if (allKeys.has(c)) return c;
      const blacklisted = (k: string) =>
        k.includes('correo') || k.includes('email') || k.includes('telefono') ||
        k.includes('cedula') || k.includes('documento');
      for (const k of allKeys) {
        if (blacklisted(k)) continue;
        if (k.includes('nombre') || k.includes('apellido')) return k;
      }
      return null;
    };
    const nameField = detectField(rows);
    const seen = new Set<string>();
    const out: { name: string }[] = [];
    for (const r of rows) {
      const data = r?.data || {};
      let name = '';
      if (nameField) {
        const v = data[nameField];
        if (v !== undefined && v !== null && String(v).trim() !== '') name = String(v).trim();
      }
      if (!name) {
        const parts = [data['primer_nombre'], data['segundo_nombre'],
          data['primer_apellido'], data['segundo_apellido']]
          .filter(p => p !== undefined && p !== null && String(p).trim() !== '')
          .map(p => String(p).trim());
        if (parts.length) name = parts.join(' ');
      }
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push({ name }); }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  submit(): void {
    this.errors = {};

    if (!this.form.responsible_user_ids.length && !this.form.responsible_dataset_names.length)
      this.errors['responsible'] = 'Debes asignar al menos un responsable.';
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

    // Construir display name a partir de los responsables seleccionados
    // (users del sistema + personas del dataset). Deduplica por nombre.
    const selectedUsers = this.users.filter(u => this.form.responsible_user_ids.includes(u.id));
    const seenNames = new Set<string>();
    const responsibleNames: string[] = [];
    for (const name of [
      ...selectedUsers.map(u => this.userDisplayName(u)),
      ...this.form.responsible_dataset_names,
    ]) {
      const trimmed = (name || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      responsibleNames.push(trimmed);
    }
    const responsibleText = responsibleNames.join(', ') || null;

    const payload = {
      responsible: responsibleText,
      responsible_user_ids: this.form.responsible_user_ids,
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
    const roleId = this.authService.getTokenPayload()?.role_id ?? null;
    if (this.permissionService.hasPermissionOrRole(PERMS.ACTION_PLANS_DELETE_ANY, roleId, ROLE_IDS.ADMIN)) return true;
    if (!this.permissionService.hasPermissionOrRole(PERMS.ACTION_PLANS_DELETE_OWN, roleId, ROLE_IDS.EDITOR, ROLE_IDS.MONITOR)) return false;
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
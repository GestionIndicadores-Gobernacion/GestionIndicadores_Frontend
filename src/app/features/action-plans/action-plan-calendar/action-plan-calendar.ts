import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, NgZone, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';  // ← agregar ActivatedRoute, Router
import { LucideAngularModule } from 'lucide-angular';
import {
  ActionPlanActivityModel, ActionPlanFilters, ActionPlanModel,
  ActionPlanObjectiveModel, ActionPlanStatus
} from '../../../features/action-plans/models/action-plan.model';
import { ComponentModel } from '../../../features/report/models/component.model';
import { StrategyModel } from '../../../features/report/models/strategy.model';
import { ActionPlanService } from '../../../features/action-plans/services/action-plan.service';
import { ComponentsService } from '../../../features/report/services/components.service';
import { StrategiesService } from '../../../features/report/services/strategies.service';
import { UsersService } from '../../../features/user/services/users.service';
import { UserResponse } from '../../../features/user/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PERMS, ROLE_IDS, isSuperAdminEmail } from '../../../core/constants/permissions';
import { catchError, of } from 'rxjs';

import { ActionPlanCreateModalComponent } from '../modals/action-plan-create-modal/action-plan-create-modal';
import { ActionPlanReportModalComponent } from '../modals/action-plan-report-modal/action-plan-report-modal';
import { ActionPlanListComponent } from '../action-plan-list/action-plan-list';
import { ActionPlanEditModalComponent } from '../modals/action-plan-create-modal/action-plan-edit-modal/action-plan-edit-modal';
import { ActionPlanCalendarGridComponent } from './action-plan-calendar-grid/action-plan-calendar-grid';
import { ActionPlanCalendarNavComponent } from './action-plan-calendar-nav/action-plan-calendar-nav';
import { ActionPlanFiltersComponent } from './action-plan-filters/action-plan-filters';
import { ActionPlanExportService } from '../../../features/action-plans/services/action-plan-export.service';
import { ActionPlanEditPlanModalComponent } from '../modals/action-plan-create-modal/action-plan-edit-modal/action-plan-edit-plan-modal/action-plan-edit-plan-modal';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  plans: ActionPlanModel[];
}

export interface FlatActivity {
  plan: ActionPlanModel;
  objective: ActionPlanObjectiveModel;
  activity: ActionPlanActivityModel;
}

interface ModalState {
  plan: ActionPlanModel | null;
  objective: ActionPlanObjectiveModel | null;
  activity: ActionPlanActivityModel | null;
}

@Component({
  selector: 'app-action-plan-calendar',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    ActionPlanCreateModalComponent,
    ActionPlanReportModalComponent,
    ActionPlanEditModalComponent,
    ActionPlanEditPlanModalComponent,
    ActionPlanListComponent,
    ActionPlanCalendarGridComponent,
    ActionPlanFiltersComponent,
    ActionPlanCalendarNavComponent,
    LucideAngularModule,
  ],
  templateUrl: './action-plan-calendar.html',
  styleUrl: './action-plan-calendar.css',
})
export class ActionPlanCalendarComponent implements OnInit {

  plans: ActionPlanModel[] = [];
  strategies: StrategyModel[] = [];
  components: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];
  calendarDays: CalendarDay[] = [];

  selectedStrategyId: number | null = null;
  selectedComponentId: number | null = null;
  activeStatusFilter: 'all' | ActionPlanStatus = 'all';
  filterByBoss = false;
  selectedDayFilter: Date | null = null;

  viewMode: 'calendar' | 'agenda' = 'calendar';
  currentDate = new Date();
  canViewDashboard = false;

  showCreateModal = false;
  showReportModal = false;
  showEditModal = false;
  modal: ModalState = { plan: null, objective: null, activity: null };
  hoveredFlat: (FlatActivity & { x: number; y: number }) | null = null;

  showEditPlanModal = false;
  planToEdit: ActionPlanModel | null = null;

  filterMyPlans = false;
  currentUserId: number | null = null;

  // ── Filtros añadidos ──────────────────────────────────────────────
  /** Búsqueda libre por nombre de actividad. */
  searchTerm = '';
  /** Usuarios seleccionados para filtrar por responsable. Vacío = sin filtro. */
  selectedResponsibleIds: number[] = [];
  /** 'all' | 'yes' | 'no'. Filtra actividades por si generan reporte vinculado. */
  generatesReportFilter: 'all' | 'yes' | 'no' = 'all';
  /** Rango de fecha de entrega (YYYY-MM-DD). null = sin tope por ese lado. */
  deliveryDateFrom: string | null = null;
  deliveryDateTo: string | null = null;
  /** Lista de usuarios cargada del backend para alimentar el multi-select. */
  allUsers: UserResponse[] = [];

  currentUser: any = null;
  /**
   * Editar plan o sus actividades.
   *
   * Política: por defecto solo el creador. Override granular vía
   * `PERM_ACTION_PLANS_UPDATE_ANY` — el permiso es la única vía de override,
   * independiente del rol. Admin sin el permiso NO puede editar planes
   * ajenos; un usuario no-admin con el permiso sí. Viewer bloqueado.
   */
  canEditPlanBound = (plan: ActionPlanModel): boolean => {
    if (!this.currentUser) return false;
    const roleId = this.authService.getTokenPayload()?.role_id ?? null;
    if (roleId === ROLE_IDS.VIEWER) return false;
    if (this.permissionService.hasPermission(PERMS.ACTION_PLANS_UPDATE_ANY)) return true;
    return plan.user_id != null && plan.user_id === this.currentUser.id;
  };
  /** Eliminar actividad: misma regla que editar plan (creador o admin). */
  canInteractWithPlan = (plan: ActionPlanModel): boolean => this.canEditPlanBound(plan);

  /** El admin principal (único que borra actividades pendientes de evidencia). */
  get isSuperAdmin(): boolean {
    return isSuperAdminEmail(this.currentUser?.email);
  }

  /**
   * Reportar una actividad: por defecto SOLO el responsable asignado al
   * plan. Override granular vía `PERM_ACTION_PLANS_REPORT_ACTIVITY` —
   * el permiso es la única vía de override, independiente del rol.
   * Admin sin el permiso NO puede; un usuario no-admin con el permiso sí.
   * Viewer está bloqueado siempre (paridad con backend `_can_report_activity`).
   */
  canReportActivity = (plan: ActionPlanModel): boolean => {
    if (!this.currentUser) return false;
    const roleId = this.authService.getTokenPayload()?.role_id ?? null;
    if (roleId === ROLE_IDS.VIEWER) return false;
    const ids = new Set<number>(plan.responsible_user_ids ?? []);
    if (plan.responsible_user_id) ids.add(plan.responsible_user_id);
    if (ids.has(this.currentUser.id)) return true;
    return this.permissionService.hasPermission(PERMS.ACTION_PLANS_REPORT_ACTIVITY);
  };

  /**
   * Estados en los que el modal de "reporte" funciona como detalle de
   * solo-lectura (Realizado) o como mezcla informativa + form acotado al
   * responsable (Pendiente de Evidencia). En ambos, abrir el modal es
   * seguro para cualquier usuario autenticado: la barrera de escritura
   * vive dentro del modal (`isReadOnly`, `canManageEvidence`) y en el
   * backend (`_can_report_activity`, `_can_add_evidence`).
   */
  private isViewableStatus(activity: ActionPlanActivityModel): boolean {
    const s = activity.status;
    return s === 'Realizado' || s === 'Pendiente de Evidencia';
  }

  /**
   * Predicado usado por el calendar-grid para decidir si un pillito es
   * clickable. Combina las dos semánticas: "se puede VER" (estado
   * visualizable) y "se puede REPORTAR" (responsable). Si cualquiera es
   * true, el click se permite y el padre (`openReportModal`) decide qué
   * modo del modal mostrar.
   */
  canOpenActivity = (plan: ActionPlanModel, activity: ActionPlanActivityModel): boolean => {
    if (this.isViewableStatus(activity)) return true;
    return this.canReportActivity(plan);
  };

  // ← NUEVO: para prefill del modal al regresar desde reporte
  prefillEvidenceUrl = '';

  private destroyRef = inject(DestroyRef);

  constructor(
    private actionPlanService: ActionPlanService,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private usersService: UsersService,
    private toast: ToastService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private exportService: ActionPlanExportService,
    private route: ActivatedRoute,   // ← NUEVO
    private router: Router,          // ← NUEVO
    private authService: AuthService,
    private permissionService: PermissionService
  ) { }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') ?? 'null');
    this.currentUser = user;                    // ← esta línea
    const roleId = this.authService.getTokenPayload()?.role_id ?? null;
    this.canViewDashboard = this.permissionService.hasPermissionOrRole(
      PERMS.ACTION_PLANS_DASHBOARD, roleId, ROLE_IDS.ADMIN, ROLE_IDS.MONITOR
    );
    this.currentUserId = user?.id ?? null;
    this.loadStrategies();
    this.loadPlans();
    this.loadUsers();
  }

  private loadUsers(): void {
    // Lista para alimentar el filtro multi-select de responsables. Si
    // falla, el filtro queda inutilizable pero el calendar sigue
    // funcionando — no es crítico.
    this.usersService.getAll()
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe(users => {
        this.allUsers = users ?? [];
        this.cdr.detectChanges();
      });
  }

  // ── Handlers de filtros nuevos ────────────────────────────────────

  onSearchChange(term: string): void { this.searchTerm = term; this.cdr.detectChanges(); }
  onResponsibleIdsChange(ids: number[]): void { this.selectedResponsibleIds = ids; this.cdr.detectChanges(); }
  onGeneratesReportChange(f: 'all' | 'yes' | 'no'): void { this.generatesReportFilter = f; this.cdr.detectChanges(); }
  onDeliveryDateFromChange(d: string | null): void { this.deliveryDateFrom = d; this.cdr.detectChanges(); }
  onDeliveryDateToChange(d: string | null): void { this.deliveryDateTo = d; this.cdr.detectChanges(); }

  clearAllFilters(): void {
    this.selectedStrategyId = null;
    this.selectedComponentId = null;
    this.filteredComponents = [];
    this.activeStatusFilter = 'all';
    this.filterByBoss = false;
    this.filterMyPlans = false;
    this.searchTerm = '';
    this.selectedResponsibleIds = [];
    this.generatesReportFilter = 'all';
    this.deliveryDateFrom = null;
    this.deliveryDateTo = null;
    this.selectedDayFilter = null;
    this.loadPlans();   // estrategia/componente afectan la query del backend
  }

  /** True si hay al menos un filtro activo (excluyendo el día). */
  get hasActiveFilters(): boolean {
    return this.selectedStrategyId !== null
        || this.selectedComponentId !== null
        || this.activeStatusFilter !== 'all'
        || this.filterByBoss
        || this.filterMyPlans
        || !!this.searchTerm
        || this.selectedResponsibleIds.length > 0
        || this.generatesReportFilter !== 'all'
        || !!this.deliveryDateFrom
        || !!this.deliveryDateTo;
  }

  exportPlans(): void {
    this.exportService.export(this.displayPlans);
  }

  openEditPlanModal(plan: ActionPlanModel, event: Event): void {
    event.stopPropagation();
    this.planToEdit = plan;
    this.showEditPlanModal = true;
  }

  onMyPlansFilterChange(v: boolean): void {
    this.filterMyPlans = v;
    this.cdr.detectChanges();
  }

  closeEditPlanModal(): void {
    this.showEditPlanModal = false;
    this.planToEdit = null;
  }

  onPlanEdited(): void {
    this.closeEditPlanModal();
    this.loadPlans();
    this.toast.success('Plan actualizado correctamente');
  }

  onPlanDeleted(): void {
    this.closeEditPlanModal();
    this.loadPlans();
    this.toast.success('Eliminación completada');
  }

  // ── Loaders ──────────────────────────────────────────────────────

  private loadStrategies(): void {
    this.strategiesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: s => { this.strategies = s ?? []; this.loadComponents(); },
      error: () => this.toast.error('Error cargando estrategias')
    });
  }

  private loadComponents(): void {
    this.componentsService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: c => {
        this.components = c ?? [];
        this.filteredComponents = this.selectedStrategyId
          ? this.components.filter(x => x.strategy_id === this.selectedStrategyId)
          : [];
      }
    });
  }

  loadPlans(): void {
    const filters: ActionPlanFilters = {
      strategy_id: this.selectedStrategyId ?? undefined,
      component_id: this.selectedComponentId ?? undefined,
      month: this.currentDate.getMonth() + 1,
      year: this.currentDate.getFullYear(),
    };
    this.actionPlanService.getAll(filters).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(plans => {
      this.plans = [...(plans ?? [])];
      this.buildCalendar();
      this.checkReturnParams();   // ← NUEVO: verificar después de cargar planes
    });
  }

  // ── NUEVO: leer query params de retorno desde reporte ────────────

  private checkReturnParams(): void {
    const reportActivityId = this.route.snapshot.queryParamMap.get('reportActivity');
    const evidenceUrl = this.route.snapshot.queryParamMap.get('evidenceUrl');
    const planId = this.route.snapshot.queryParamMap.get('planId');

    if (!reportActivityId && !planId) return;

    // Limpiar params de la URL sin recargar
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });

    if (reportActivityId) {
      this.openReportModalForActivity(+reportActivityId, evidenceUrl ?? '');
    } else if (planId) {
      this.openPlanFromNotification(+planId);
    }
  }

  private openPlanFromNotification(planId: number): void {
    // Fetch directo por id — no depender de `this.plans`, que está
    // filtrado por mes y puede no contener el plan target.
    this.actionPlanService.getById(planId)
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe(plan => {
        if (!plan) {
          this.toast.error('No se pudo encontrar el plan de acción.');
          return;
        }

        // Navegar el calendar al mes de la primera actividad pendiente
        // (o cualquier actividad si todas están realizadas) para que el
        // contexto detrás del modal sea coherente.
        const activities = (plan.plan_objectives ?? []).flatMap(o => o.activities ?? []);
        const firstActivity = activities.find(a => a.status !== 'Realizado') ?? activities[0];
        if (firstActivity?.delivery_date) {
          const d = new Date(firstActivity.delivery_date + 'T00:00:00');
          const target = new Date(d.getFullYear(), d.getMonth(), 1);
          if (target.getTime() !== this.currentDate.getTime()) {
            this.currentDate = target;
            this.loadPlans();
          }
        }

        this.planToEdit = plan;
        this.showEditPlanModal = true;
        this.cdr.detectChanges();
      });
  }

  private openReportModalForActivity(activityId: number, evidenceUrl: string): void {
    for (const plan of this.plans) {
      for (const obj of plan.plan_objectives ?? []) {
        const activity = obj.activities.find(a => a.id === activityId);
        if (activity) {
          this.prefillEvidenceUrl = evidenceUrl;
          this.setModal(plan, obj, activity);
          this.showReportModal = true;
          this.cdr.detectChanges();
          return;
        }
      }
    }
    // Si no se encontró (porque el mes no coincide), mostrar advertencia
    this.toast.error('No se pudo encontrar la actividad. Verifica el mes del calendario.');
  }

  // ─────────────────────────────────────────────────────────────────

  private buildCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const endPadding = 6 - lastDay.getDay();
    const lastDayPrevM = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];

    for (let i = startPadding - 1; i >= 0; i--)
      days.push({ date: new Date(year, month - 1, lastDayPrevM - i), isCurrentMonth: false, isToday: false, plans: [] });

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      const plansOfDay = this.plans.filter(plan =>
        (plan.plan_objectives ?? []).some(obj =>
          (obj.activities ?? []).some(act => {
            const p = this.parseDateOnly(act.delivery_date);
            return p.y === year && p.m === month && p.d === d;
          })
        )
      );
      days.push({ date, isCurrentMonth: true, isToday, plans: plansOfDay });
    }

    for (let i = 1; i <= endPadding; i++)
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, isToday: false, plans: [] });

    this.calendarDays = [...days];
    this.cdr.detectChanges();
  }

  // ── Filters ───────────────────────────────────────────────────────

  onStrategyChange(id: number | null): void {
    this.selectedStrategyId = id;
    this.selectedComponentId = null;
    this.filteredComponents = id ? this.components.filter(c => c.strategy_id === id) : [];
    this.loadPlans();
  }

  onComponentChange(id: number | null): void { this.selectedComponentId = id; this.loadPlans(); }
  onStatusFilterChange(f: 'all' | ActionPlanStatus): void { this.activeStatusFilter = f; this.cdr.detectChanges(); }
  onBossFilterChange(v: boolean): void { this.filterByBoss = v; this.cdr.detectChanges(); }

  get displayPlans(): ActionPlanModel[] {
    let result = this.plans;

    // ── Filtros a nivel de plan ─────────────────────────────────────
    if (this.filterMyPlans && this.currentUserId)
      result = result.filter(p =>
        p.responsible_user_id === this.currentUserId ||
        (p.responsible_user_ids ?? []).includes(this.currentUserId!)
      );

    if (this.selectedResponsibleIds.length > 0) {
      const ids = new Set(this.selectedResponsibleIds);
      result = result.filter(p => {
        if (p.responsible_user_id != null && ids.has(p.responsible_user_id)) return true;
        return (p.responsible_user_ids ?? []).some(id => ids.has(id));
      });
    }

    // ── Filtros a nivel de actividad (recortan el árbol) ────────────
    const term = this.searchTerm.trim().toLowerCase();
    const dateFrom = this.deliveryDateFrom;
    const dateTo = this.deliveryDateTo;

    const needsActivityFilter =
      this.activeStatusFilter !== 'all'
      || this.filterByBoss
      || this.selectedDayFilter
      || this.generatesReportFilter !== 'all'
      || !!term
      || !!dateFrom
      || !!dateTo;

    if (needsActivityFilter) {
      const dayCmp = this.selectedDayFilter
        ? this.parseDateOnly(this.selectedDayFilter.toISOString().split('T')[0])
        : null;

      result = result
        .map(p => ({
          ...p,
          plan_objectives: (p.plan_objectives ?? [])
            .map(o => ({
              ...o,
              activities: (o.activities ?? []).filter(a => {
                if (this.activeStatusFilter !== 'all' && a.status !== this.activeStatusFilter) return false;
                if (this.filterByBoss && !a.requires_boss_assistance) return false;
                if (this.generatesReportFilter === 'yes' && !a.generates_report) return false;
                if (this.generatesReportFilter === 'no' && a.generates_report) return false;
                if (term && !(a.name ?? '').toLowerCase().includes(term)) return false;
                if (dayCmp) {
                  const p2 = this.parseDateOnly(a.delivery_date);
                  if (p2.y !== dayCmp.y || p2.m !== dayCmp.m || p2.d !== dayCmp.d) return false;
                }
                if (dateFrom && a.delivery_date < dateFrom) return false;
                if (dateTo && a.delivery_date > dateTo) return false;
                return true;
              }),
            }))
            .filter(o => o.activities.length > 0),
        }))
        .filter(p => p.plan_objectives.length > 0);
    }

    return result;
  }

  get filteredPlansCount(): number {
    return this.displayPlans.reduce((t, p) => t + (p.plan_objectives ?? []).reduce((t2, o) => t2 + (o.activities ?? []).length, 0), 0);
  }

  // ── Navigation ────────────────────────────────────────────────────

  onMonthChange(date: Date): void { this.currentDate = date; this.loadPlans(); }
  openDayAgenda(day: CalendarDay): void { this.selectedDayFilter = day.date; this.viewMode = 'agenda'; }
  clearDayFilter(): void { this.selectedDayFilter = null; this.viewMode = 'calendar'; }

  // ── Modals ────────────────────────────────────────────────────────

  private setModal(p: ActionPlanModel, o: ActionPlanObjectiveModel, a: ActionPlanActivityModel): void { this.modal = { plan: p, objective: o, activity: a }; }
  private clearModal(): void { this.modal = { plan: null, objective: null, activity: null }; }

  openCreateModal(): void { this.showCreateModal = true; }
  closeCreateModal(): void { this.showCreateModal = false; }
  onPlanCreated(): void { this.closeCreateModal(); this.loadPlans(); this.toast.success('Plan creado correctamente'); }

  openReportModal(p: ActionPlanModel, o: ActionPlanObjectiveModel, a: ActionPlanActivityModel, event: Event): void {
    event.stopPropagation();

    // El modal sirve para tres cosas según `activity.status`:
    //  - 'Realizado'             → detalle solo-lectura (todos pueden VER).
    //  - 'Pendiente de Evidencia'→ detalle + form de evidencia gateado por
    //                              `canManageEvidence` dentro del propio modal
    //                              (a quien no es responsable se le muestra
    //                              el aviso "solo el responsable puede agregar
    //                              la evidencia").
    //  - 'Pendiente' / 'En Ejecución' → reporte inicial; SOLO el responsable
    //                                   (o admin) puede entrar.
    //
    // La guarda anterior bloqueaba SIEMPRE a no-responsables, lo que rompía
    // el caso "Ver" del monitor sobre actividades Realizado/Pendiente de
    // Evidencia. El backend mantiene la barrera de escritura (PUT /report y
    // /evidence) en `_can_report_activity` y `_can_add_evidence`.
    if (!this.isViewableStatus(a) && !this.canReportActivity(p)) {
      this.toast.error('Solo el responsable asignado del plan puede reportar esta actividad.');
      return;
    }
    this.prefillEvidenceUrl = '';   // ← limpiar prefill al abrir manualmente
    this.setModal(p, o, a);
    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.prefillEvidenceUrl = '';   // ← limpiar al cerrar
    this.clearModal();
  }

  onPlanReported(): void { this.closeReportModal(); this.loadPlans(); this.toast.success('Actividad reportada correctamente'); }

  openEditModal(p: ActionPlanModel, o: ActionPlanObjectiveModel, a: ActionPlanActivityModel, event: Event): void { event.stopPropagation(); this.setModal(p, o, a); this.showEditModal = true; }
  closeEditModal(): void { this.showEditModal = false; this.clearModal(); }
  onActivityEdited(): void { this.closeEditModal(); this.loadPlans(); this.toast.success('Actividad actualizada correctamente'); }

  deleteActivity(activityId: number, event: Event): void {
    event.stopPropagation();
    this.toast.confirm('Eliminar actividad', 'Si es la única actividad del objetivo, también se eliminará el objetivo.')
      .then(result => {
        if (!result.isConfirmed) return;
        this.ngZone.run(() => {
          this.actionPlanService.deleteActivity(activityId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.loadPlans(); this.toast.success('Actividad eliminada'); },
            error: () => this.toast.error('Error al eliminar')
          });
        });
      });
  }



  clampTooltipX(x: number): number {
    const tooltipWidth = 224;
    const margin = 8;
    const maxX = window.innerWidth - tooltipWidth - margin;
    return Math.max(margin, Math.min(x, maxX));
  }

  parseDateOnly(dateStr: string): { y: number; m: number; d: number } {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { y, m: m - 1, d };
  }
}
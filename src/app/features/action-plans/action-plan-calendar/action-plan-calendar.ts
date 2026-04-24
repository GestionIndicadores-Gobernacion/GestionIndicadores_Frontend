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
import { ToastService } from '../../../core/services/toast.service';
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

  currentUser: any = null;
  canEditPlanBound = (plan: ActionPlanModel): boolean => {
    const role = this.currentUser?.role?.name;
    return role === 'admin' || role === 'monitor';
  };
  canInteractWithPlan = (plan: ActionPlanModel): boolean => {
    if (!this.currentUser) return false;
    const role = this.currentUser.role?.name;
    if (role === 'admin' || role === 'monitor') return true;
    if (role === 'viewer') return false;
    if (role === 'editor') {
      const assigned = (this.currentUser.component_assignments ?? []).map((c: any) => c.component_id);
      if (assigned.includes(plan.component_id)) return true;
      if (plan.responsible_user_id && plan.responsible_user_id === this.currentUser.id) return true;
      if ((plan.responsible_user_ids ?? []).includes(this.currentUser.id)) return true;
      return false;
    }
    return false;
  };

  // ← NUEVO: para prefill del modal al regresar desde reporte
  prefillEvidenceUrl = '';

  private destroyRef = inject(DestroyRef);

  constructor(
    private actionPlanService: ActionPlanService,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private toast: ToastService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private exportService: ActionPlanExportService,
    private route: ActivatedRoute,   // ← NUEVO
    private router: Router           // ← NUEVO
  ) { }

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') ?? 'null');
    this.currentUser = user;                    // ← esta línea
    this.canViewDashboard = user?.role?.name === 'admin' || user?.role?.name === 'monitor';
    this.currentUserId = user?.id ?? null;
    this.loadStrategies();
    this.loadPlans();
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
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) return;
    // Navegar al mes de la primera actividad pendiente del plan
    const firstActivity = (plan.plan_objectives ?? [])
      .flatMap(o => o.activities ?? [])
      .find(a => a.status !== 'Realizado');
    if (firstActivity?.delivery_date) {
      const d = new Date(firstActivity.delivery_date + 'T00:00:00');
      this.currentDate = new Date(d.getFullYear(), d.getMonth(), 1);
      this.buildCalendar();
    }
    // Activar filtro "mis planes" para que el plan sea visible
    this.filterMyPlans = true;
    this.cdr.detectChanges();
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
    if (this.filterMyPlans && this.currentUserId)
      result = result.filter(p =>
        p.responsible_user_id === this.currentUserId ||
        (p.responsible_user_ids ?? []).includes(this.currentUserId!)
      );
    if (this.activeStatusFilter !== 'all')
      result = result.map(p => ({ ...p, plan_objectives: (p.plan_objectives ?? []).map(o => ({ ...o, activities: (o.activities ?? []).filter(a => a.status === this.activeStatusFilter) })).filter(o => o.activities.length > 0) })).filter(p => p.plan_objectives.length > 0);
    if (this.filterByBoss)
      result = result.map(p => ({ ...p, plan_objectives: (p.plan_objectives ?? []).map(o => ({ ...o, activities: (o.activities ?? []).filter(a => a.requires_boss_assistance) })).filter(o => o.activities.length > 0) })).filter(p => p.plan_objectives.length > 0);
    if (this.selectedDayFilter) {
      const { y, m, d } = this.parseDateOnly(this.selectedDayFilter.toISOString().split('T')[0]);
      result = result.map(p => ({ ...p, plan_objectives: (p.plan_objectives ?? []).map(o => ({ ...o, activities: (o.activities ?? []).filter(a => { const p2 = this.parseDateOnly(a.delivery_date); return p2.y === y && p2.m === m && p2.d === d; }) })).filter(o => o.activities.length > 0) })).filter(p => p.plan_objectives.length > 0);
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
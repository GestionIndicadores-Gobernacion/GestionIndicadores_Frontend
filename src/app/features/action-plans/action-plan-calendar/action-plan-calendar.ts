import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ActionPlanActivityModel,
  ActionPlanFilters,
  ActionPlanModel,
  ActionPlanObjectiveModel,
  ActionPlanStatus
} from '../../../core/models/action-plan.model';
import { ComponentModel } from '../../../core/models/component.model';
import { StrategyModel } from '../../../core/models/strategy.model';
import { ActionPlanService } from '../../../core/services/action-plan.service';
import { ComponentsService } from '../../../core/services/components.service';
import { StrategiesService } from '../../../core/services/strategies.service';
import { ToastService } from '../../../core/services/toast.service';
import { ActionPlanCreateModalComponent } from '../modals/action-plan-create-modal/action-plan-create-modal';
import { ActionPlanReportModalComponent } from '../modals/action-plan-report-modal/action-plan-report-modal';
import { ActionPlanListComponent } from '../action-plan-list/action-plan-list';
import { PlansCountByStatusPipe } from '../pipes/action-plan-status.pipe';
import { catchError, of } from 'rxjs';
import { ActionPlanAuditLogComponent } from '../action-plan-audit-log/action-plan-audit-log';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  plans: ActionPlanModel[];
}

// Actividad aplanada para el calendario
export interface FlatActivity {
  plan:      ActionPlanModel;
  objective: ActionPlanObjectiveModel;
  activity:  ActionPlanActivityModel;
}

@Component({
  selector: 'app-action-plan-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PlansCountByStatusPipe,
    ActionPlanCreateModalComponent,
    ActionPlanReportModalComponent,
    ActionPlanListComponent,
    ActionPlanAuditLogComponent
  ],
  templateUrl: './action-plan-calendar.html',
  styleUrl: './action-plan-calendar.css',
})
export class ActionPlanCalendarComponent implements OnInit {

  plans:              ActionPlanModel[] = [];
  strategies:         StrategyModel[]   = [];
  components:         ComponentModel[]  = [];
  filteredComponents: ComponentModel[]  = [];

  selectedStrategyId:  number | null = null;
  selectedComponentId: number | null = null;

  currentDate  = new Date();
  calendarDays: CalendarDay[] = [];

  loading         = false;
  showCreateModal = false;
  showReportModal = false;
  selectedPlan:      ActionPlanModel         | null = null;
  selectedObjective: ActionPlanObjectiveModel | null = null;
  selectedActivity:  ActionPlanActivityModel  | null = null;

  viewMode: 'calendar' | 'agenda' = 'calendar';
  hoveredFlat: (FlatActivity & { x: number; y: number }) | null = null;

  readonly MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly WEEKDAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  constructor(
    private actionPlanService: ActionPlanService,
    private strategiesService: StrategiesService,
    private componentsService: ComponentsService,
    private toast:  ToastService,
    private ngZone: NgZone,
    private cdr:    ChangeDetectorRef
  ) { }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════

  ngOnInit(): void {
    this.loadStrategies();
    this.loadPlans();
  }

  // ═══════════════════════════════════════
  // DATA LOADERS
  // ═══════════════════════════════════════

  private loadStrategies(): void {
    this.strategiesService.getAll().subscribe({
      next: s => { this.strategies = s ?? []; this.loadComponents(); },
      error: () => this.toast.error('Error cargando estrategias')
    });
  }

  private loadComponents(): void {
    this.componentsService.getAll().subscribe({
      next: c => {
        this.components = c ?? [];
        this.filteredComponents = this.selectedStrategyId
          ? this.components.filter(x => x.strategy_id === this.selectedStrategyId)
          : [];
      },
      error: () => this.toast.error('Error cargando componentes')
    });
  }

  private loadPlans(): void {
    const filters: ActionPlanFilters = {
      strategy_id:  this.selectedStrategyId  ?? undefined,
      component_id: this.selectedComponentId ?? undefined,
      month: this.currentDate.getMonth() + 1,
      year:  this.currentDate.getFullYear(),
    };
    this.actionPlanService.getAll(filters).pipe(
      catchError(() => of([]))
    ).subscribe(plans => {
      this.plans = [...(plans ?? [])];
      this.buildCalendar();
    });
  }

  // ═══════════════════════════════════════
  // HELPERS — aplanar actividades
  // ═══════════════════════════════════════

  /** Devuelve todas las actividades de un plan aplanadas con su objetivo */
  flatActivities(plan: ActionPlanModel): FlatActivity[] {
    const result: FlatActivity[] = [];
    for (const obj of plan.plan_objectives ?? []) {
      for (const act of obj.activities ?? []) {
        result.push({ plan, objective: obj, activity: act });
      }
    }
    return result;
  }

  /** Verifica si una actividad cae en el día dado */
  activityFallsOnDay(activity: ActionPlanActivityModel, date: Date): boolean {
    const { y, m, d } = this.parseDateOnly(activity.delivery_date);
    const calYear  = this.currentDate.getFullYear();
    const calMonth = this.currentDate.getMonth();
    if (y !== calYear || m !== calMonth) return false;
    return d === date.getDate() && m === date.getMonth() && y === date.getFullYear();
  }

  countActivitiesInDay(day: CalendarDay): number {
    return day.plans.reduce((total, plan) => {
      return total + this.flatActivities(plan).filter(f => this.activityFallsOnDay(f.activity, day.date)).length;
    }, 0);
  }

  getStaffNames(activity: ActionPlanActivityModel): string {
    return (activity.support_staff ?? []).map(s => s.name).join(', ');
  }

  // ═══════════════════════════════════════
  // DATE PARSER
  // ═══════════════════════════════════════

  private parseDateOnly(dateStr: string): { y: number; m: number; d: number } {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { y, m: m - 1, d };
  }

  // ═══════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════

  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.loadPlans();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.loadPlans();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.loadPlans();
  }

  get currentMonthLabel(): string {
    return `${this.MONTHS[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  onMonthSelect(event: Event): void {
    const month = +(event.target as HTMLSelectElement).value;
    this.currentDate = new Date(this.currentDate.getFullYear(), month, 1);
    this.loadPlans();
  }

  onYearSelect(event: Event): void {
    const year = +(event.target as HTMLSelectElement).value;
    this.currentDate = new Date(year, this.currentDate.getMonth(), 1);
    this.loadPlans();
  }

  get availableYears(): number[] {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current - 3 + i);
  }

  // ═══════════════════════════════════════
  // FILTROS
  // ═══════════════════════════════════════

  onStrategyChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStrategyId  = value ? +value : null;
    this.selectedComponentId = null;
    this.filteredComponents  = this.selectedStrategyId
      ? this.components.filter(c => c.strategy_id === this.selectedStrategyId)
      : [];
    this.loadPlans();
  }

  onComponentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedComponentId = value ? +value : null;
    this.loadPlans();
  }

  // ═══════════════════════════════════════
  // MODALES
  // ═══════════════════════════════════════

  openCreateModal(): void  { this.showCreateModal = true; }
  closeCreateModal(): void { this.showCreateModal = false; }

  openReportModal(plan: ActionPlanModel, objective: ActionPlanObjectiveModel, activity: ActionPlanActivityModel, event: Event): void {
    event.stopPropagation();
    this.selectedPlan      = plan;
    this.selectedObjective = objective;
    this.selectedActivity  = activity;
    this.showReportModal   = true;
  }

  closeReportModal(): void {
    this.showReportModal   = false;
    this.selectedPlan      = null;
    this.selectedObjective = null;
    this.selectedActivity  = null;
  }

  onPlanCreated(): void {
    this.closeCreateModal();
    this.loadPlans();
    this.toast.success('Plan creado correctamente');
  }

  onPlanReported(): void {
    this.closeReportModal();
    this.loadPlans();
    this.toast.success('Actividad reportada correctamente');
  }

  deleteActivity(activityId: number, event: Event): void {
    event.stopPropagation();
    this.toast.confirm('Eliminar actividad', 'Si es la única actividad del objetivo, también se eliminará el objetivo.')
      .then(result => {
        if (!result.isConfirmed) return;
        this.ngZone.run(() => {
          this.actionPlanService.deleteActivity(activityId).subscribe({
            next:  () => { this.loadPlans(); this.toast.success('Actividad eliminada'); },
            error: () => this.toast.error('Error al eliminar')
          });
        });
      });
  }

  // ═══════════════════════════════════════
  // TOOLTIP
  // ═══════════════════════════════════════

  showTooltip(flat: FlatActivity, event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoveredFlat = { ...flat, x: rect.left, y: rect.top };
  }

  hideTooltip(): void {
    this.hoveredFlat = null;
  }

  // ═══════════════════════════════════════
  // STATUS HELPERS
  // ═══════════════════════════════════════

  statusClass(status: ActionPlanStatus): string {
    const map: Record<ActionPlanStatus, string> = {
      'Realizado':    'bg-emerald-50 text-emerald-700 border-emerald-200',
      'En Ejecución': 'bg-blue-50 text-blue-700 border-blue-200',
      'Pendiente':    'bg-red-50 text-red-700 border-red-200',
    };
    return map[status];
  }

  statusDot(status: ActionPlanStatus): string {
    const map: Record<ActionPlanStatus, string> = {
      'Realizado':    'bg-emerald-500',
      'En Ejecución': 'bg-blue-500',
      'Pendiente':    'bg-red-500',
    };
    return map[status];
  }

  // ═══════════════════════════════════════
  // TRACK BY
  // ═══════════════════════════════════════

  trackByPlan(_: number, plan: ActionPlanModel): number { return plan.id; }
  trackByObjective(_: number, obj: ActionPlanObjectiveModel): number { return obj.id ?? 0; }
  trackByActivity(_: number, act: ActionPlanActivityModel): number { return act.id ?? 0; }
  trackByDay(_: number, day: CalendarDay): string {
    return `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}-${day.plans.length}`;
  }

  // ═══════════════════════════════════════
  // BUILD CALENDAR
  // ═══════════════════════════════════════

  private buildCalendar(): void {
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();

    const firstDay      = new Date(year, month, 1);
    const lastDay       = new Date(year, month + 1, 0);
    const startPadding  = firstDay.getDay();
    const endPadding    = 6 - lastDay.getDay();
    const lastDayPrevM  = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, lastDayPrevM - i), isCurrentMonth: false, isToday: false, plans: [] });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date    = new Date(year, month, d);
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

    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, isToday: false, plans: [] });
    }

    this.calendarDays = [...days];
    this.cdr.detectChanges();
  }
}
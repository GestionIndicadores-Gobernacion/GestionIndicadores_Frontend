import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import {
  ActionPlanActivityModel, ActionPlanModel,
  ActionPlanObjectiveModel, ActionPlanStatus
} from '../../../../core/models/action-plan.model';
import { CalendarDay, FlatActivity } from '../action-plan-calendar';

@Component({
  selector: 'app-action-plan-calendar-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-plan-calendar-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionPlanCalendarGridComponent {

  @Input() calendarDays: CalendarDay[] = [];
  @Input() displayPlans: ActionPlanModel[] = [];
  @Input() currentDate = new Date();

  @Output() report = new EventEmitter<{ plan: ActionPlanModel; objective: ActionPlanObjectiveModel; activity: ActionPlanActivityModel; event: Event }>();
  @Output() edit = new EventEmitter<{ plan: ActionPlanModel; objective: ActionPlanObjectiveModel; activity: ActionPlanActivityModel; event: Event }>();
  @Output() delete = new EventEmitter<{ activityId: number; event: Event }>();
  @Output() openAgenda = new EventEmitter<CalendarDay>();
  @Output() hover = new EventEmitter<(FlatActivity & { x: number; y: number }) | null>();

  readonly WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  getDisplayPlansForDay(day: CalendarDay): ActionPlanModel[] {
    return this.displayPlans.filter(plan =>
      (plan.plan_objectives ?? []).some(obj =>
        (obj.activities ?? []).some(act => this.activityFallsOnDay(act, day.date))
      )
    );
  }

  getActivitiesForDay(obj: ActionPlanObjectiveModel, date: Date): ActionPlanActivityModel[] {
    return (obj.activities ?? []).filter(act => this.activityFallsOnDay(act, date));
  }

  activityFallsOnDay(activity: ActionPlanActivityModel, date: Date): boolean {
    const { y, m, d } = this.parseDateOnly(activity.delivery_date);
    const calYear = this.currentDate.getFullYear();
    const calMonth = this.currentDate.getMonth();
    if (y !== calYear || m !== calMonth) return false;
    return d === date.getDate() && m === date.getMonth() && y === date.getFullYear();
  }

  countActivitiesInDay(day: CalendarDay): number {
    return this.getDisplayPlansForDay(day).reduce((total, plan) =>
      total + (plan.plan_objectives ?? []).reduce((t, obj) =>
        t + this.getActivitiesForDay(obj, day.date).length, 0), 0);
  }

  parseDateOnly(dateStr: string): { y: number; m: number; d: number } {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { y, m: m - 1, d };
  }

  statusClass(status: ActionPlanStatus): string {
    const map: Record<ActionPlanStatus, string> = {
      'Realizado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'En Ejecución': 'bg-blue-50 text-blue-700 border-blue-200',
      'Pendiente': 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status];
  }

  statusDot(status: ActionPlanStatus): string {
    const map: Record<ActionPlanStatus, string> = {
      'Realizado': 'bg-emerald-500',
      'En Ejecución': 'bg-blue-500',
      'Pendiente': 'bg-red-500',
    };
    return map[status];
  }

  showTooltip(flat: FlatActivity, event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hover.emit({ ...flat, x: rect.left, y: rect.top });
  }

  trackByPlan(_: number, plan: ActionPlanModel): number { return plan.id; }
  trackByObjective(_: number, obj: ActionPlanObjectiveModel): number { return obj.id ?? 0; }
  trackByActivity(_: number, act: ActionPlanActivityModel): number { return act.id ?? 0; }
  trackByDay(_: number, day: CalendarDay): string {
    return `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
  }

  getFlatActivitiesForDay(day: CalendarDay): { plan: ActionPlanModel; obj: ActionPlanObjectiveModel; activity: ActionPlanActivityModel }[] {
    const result: { plan: ActionPlanModel; obj: ActionPlanObjectiveModel; activity: ActionPlanActivityModel }[] = [];
    for (const plan of this.getDisplayPlansForDay(day)) {
      for (const obj of plan.plan_objectives ?? []) {
        for (const activity of this.getActivitiesForDay(obj, day.date)) {
          result.push({ plan, obj, activity });
        }
      }
    }
    return result;
  }

  trackByFlat(_: number, flat: { plan: ActionPlanModel; obj: ActionPlanObjectiveModel; activity: ActionPlanActivityModel }): number {
    return flat.activity.id ?? 0;
  }
}
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel,
  ActionPlanStatus
} from '../../../core/models/action-plan.model';

interface AgendaItem {
  date: Date;
  plan: ActionPlanModel;
  objective: ActionPlanObjectiveModel;
  activity: ActionPlanActivityModel;
}

@Component({
  selector: 'app-action-plan-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-plan-list.html',
  styleUrl: './action-plan-list.css',
})
export class ActionPlanListComponent {

  @Input() currentUserId?: number | null;
  @Input() isAdmin = false;

  @Input() plans: ActionPlanModel[] = [];

  @Output() report = new EventEmitter<{ plan: ActionPlanModel; objective: ActionPlanObjectiveModel; activity: ActionPlanActivityModel; event: Event }>();
  @Output() delete = new EventEmitter<{ activityId: number; event: Event }>();

  readonly WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  get agendaItems(): AgendaItem[] {
    const items: AgendaItem[] = [];
    for (const plan of this.plans) {
      for (const obj of plan.plan_objectives ?? []) {
        for (const activity of obj.activities ?? []) {
          const [y, m, d] = activity.delivery_date.split('-').map(Number);
          items.push({ date: new Date(y, m - 1, d), plan, objective: obj, activity });
        }
      }
    }
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  objectiveLabel(obj: ActionPlanObjectiveModel): string {
    return obj.objective_text ?? 'Objetivo del componente';
  }

  getStaffNames(activity: ActionPlanActivityModel): string {
    return (activity.support_staff ?? []).map(s => s.name).join(', ');
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

  onReport(plan: ActionPlanModel, objective: ActionPlanObjectiveModel, activity: ActionPlanActivityModel, event: Event): void {
    event.stopPropagation();
    this.report.emit({ plan, objective, activity, event });
  }

  onDelete(activityId: number, event: Event): void {
    event.stopPropagation();
    this.delete.emit({ activityId, event });
  }

  canModify(plan: ActionPlanModel): boolean {
    return true;
  }
}
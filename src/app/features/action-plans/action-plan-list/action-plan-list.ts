import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel,
  ActionPlanStatus
} from '../../../core/models/action-plan.model';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';

interface AgendaItem {
  date: Date;
  plan: ActionPlanModel;
  objective: ActionPlanObjectiveModel;
  activity: ActionPlanActivityModel;
}

type SortField = 'date' | 'status' | 'name';

@Component({
  selector: 'app-action-plan-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './action-plan-list.html',
  styleUrl: './action-plan-list.css',
})
export class ActionPlanListComponent {

  @Input() currentUserId?: number | null;
  @Input() isAdmin = false;
  @Input() plans: ActionPlanModel[] = [];

  @Output() report = new EventEmitter<{ plan: ActionPlanModel; objective: ActionPlanObjectiveModel; activity: ActionPlanActivityModel; event: Event }>();
  @Output() delete = new EventEmitter<{ activityId: number; event: Event }>();
  @Output() edit = new EventEmitter<{ plan: ActionPlanModel; objective: ActionPlanObjectiveModel; activity: ActionPlanActivityModel; event: Event }>();

  readonly WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  search = '';
  statusFilter: ActionPlanStatus | 'all' = 'all';

  sortField: SortField = 'date';
  sortDir: 'asc' | 'desc' = 'asc';

  page = 1;
  pageSize = 8;

  // ─────────────────────────────
  // FLATTEN ACTIVITIES
  // ─────────────────────────────

  get agendaItems(): AgendaItem[] {

    const items: AgendaItem[] = [];

    for (const plan of this.plans) {
      for (const obj of plan.plan_objectives ?? []) {
        for (const activity of obj.activities ?? []) {

          const [y, m, d] = activity.delivery_date.split('-').map(Number);

          items.push({
            date: new Date(y, m - 1, d),
            plan,
            objective: obj,
            activity
          });

        }
      }
    }

    return items;
  }

  // ─────────────────────────────
  // FILTER + SEARCH
  // ─────────────────────────────

  get filteredItems(): AgendaItem[] {

    let items = [...this.agendaItems];

    if (this.search) {

      const s = this.search.toLowerCase();

      items = items.filter(x =>
        x.activity.name?.toLowerCase().includes(s) ||
        x.activity.deliverable?.toLowerCase().includes(s) ||
        x.plan.responsible?.toLowerCase().includes(s)
      );
    }

    if (this.statusFilter !== 'all') {
      items = items.filter(x => x.activity.status === this.statusFilter);
    }

    // SORT

    items.sort((a, b) => {

      let val = 0;

      if (this.sortField === 'date') {
        val = a.date.getTime() - b.date.getTime();
      }

      if (this.sortField === 'name') {
        val = (a.activity.name ?? '').localeCompare(b.activity.name ?? '');
      }

      if (this.sortField === 'status') {
        val = (a.activity.status ?? '').localeCompare(b.activity.status ?? '');
      }

      return this.sortDir === 'asc' ? val : -val;

    });

    return items;
  }

  // ─────────────────────────────
  // PAGINATION
  // ─────────────────────────────

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.pageSize) || 1;
  }

  get paginatedItems(): AgendaItem[] {

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    return this.filteredItems.slice(start, end);
  }

  changePage(p: number) {
    this.page = p;
  }

  // ─────────────────────────────
  // HELPERS
  // ─────────────────────────────

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

  onEdit(plan: ActionPlanModel, objective: ActionPlanObjectiveModel, activity: ActionPlanActivityModel, event: Event): void {
    event.stopPropagation();
    this.edit.emit({ plan, objective, activity, event });
  }

}
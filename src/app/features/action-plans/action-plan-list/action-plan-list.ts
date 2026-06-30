import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel,
  ActionPlanStatus
} from '../../../features/action-plans/models/action-plan.model';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { PERMS, ROLE_IDS, isSuperAdminEmail } from '../../../core/constants/permissions';

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
  imports: [CommonModule, FormsModule, Pagination, LucideAngularModule],
  templateUrl: './action-plan-list.html',
  styleUrl: './action-plan-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionPlanListComponent {

  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);

  @Input() currentUserId?: number | null;
  @Input() isAdmin = false;
  @Input() plans: ActionPlanModel[] = [];
  @Input() currentUser: any = null;
  @Input() canEditPlan: (plan: ActionPlanModel) => boolean = () => false;
  /**
   * Responsables del plan pueden reportar. Override granular vía permiso
   * `ACTION_PLANS_REPORT_ACTIVITY` (administrable desde la UI). Sin ese
   * permiso, ni admin reporta planes ajenos.
   */
  @Input() canReport: (plan: ActionPlanModel) => boolean = () => false;

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

  statusClass(status: ActionPlanStatus, generatesReport?: boolean): string {
    if (status === 'En Ejecución' && generatesReport)
      return 'bg-purple-50 text-purple-700 border-purple-200';
    const map: Record<ActionPlanStatus, string> = {
      'Realizado':              'bg-emerald-50 text-emerald-700 border-emerald-200',
      'En Ejecución':           'bg-blue-50 text-blue-700 border-blue-200',
      'Pendiente':              'bg-red-50 text-red-700 border-red-200',
      'Pendiente de Evidencia': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return map[status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  }

  statusDot(status: ActionPlanStatus, generatesReport?: boolean): string {
    if (status === 'En Ejecución' && generatesReport) return 'bg-purple-500';
    const map: Record<ActionPlanStatus, string> = {
      'Realizado':              'bg-emerald-500',
      'En Ejecución':           'bg-blue-500',
      'Pendiente':              'bg-red-500',
      'Pendiente de Evidencia': 'bg-amber-500',
    };
    return map[status] ?? 'bg-slate-400';
  }

  /** Etiqueta del botón de acción según el estado */
  actionLabel(status: ActionPlanStatus): string {
    if (status === 'Realizado') return 'Ver';
    if (status === 'Pendiente de Evidencia') return 'Agregar evidencia';
    return 'Reportar';
  }

  /** True si el botón de acción debe mostrarse activo */
  canClickAction(activity: ActionPlanActivityModel, plan: ActionPlanModel): boolean {
    // Realizado: solo lectura, todos pueden ver el detalle.
    if (activity.status === 'Realizado') return true;
    // Reportar / Agregar evidencia → exclusivo del responsable (o admin).
    return this.canReport(plan);
  }

  onReport(plan: ActionPlanModel, objective: ActionPlanObjectiveModel, activity: ActionPlanActivityModel, event: Event): void {
    event.stopPropagation();
    // Defensa en profundidad: si por alguna ruta llega un click no
    // autorizado, no emitir. Solo se permite ver detalle si Realizado.
    if (activity.status !== 'Realizado' && !this.canReport(plan)) return;
    this.report.emit({ plan, objective, activity, event });
  }

  onDelete(activityId: number, event: Event): void {
    event.stopPropagation();
    this.delete.emit({ activityId, event });
  }

  /**
   * Eliminar actividad: mismas reglas que editar el plan.
   *
   * Política: por defecto solo el creador. Override granular vía
   * `PERM_ACTION_PLANS_UPDATE_ANY` — el permiso es la única vía de override,
   * independiente del rol. Admin sin el permiso NO puede modificar planes
   * ajenos; un usuario no-admin con el permiso sí. Viewer bloqueado.
   * (Paridad con calendar.canEditPlanBound y backend `_can_edit_plan`.)
   */
  canModify(plan: ActionPlanModel): boolean {
    if (!this.currentUser) return false;
    const roleId = this.authService.getTokenPayload()?.role_id ?? null;
    if (roleId === ROLE_IDS.VIEWER) return false;
    if (this.permissionService.hasPermission(PERMS.ACTION_PLANS_UPDATE_ANY)) return true;
    return plan.user_id != null && plan.user_id === this.currentUser.id;
  }

  /** El admin principal (único que borra actividades pendientes de evidencia). */
  get isSuperAdmin(): boolean {
    return isSuperAdminEmail(this.currentUser?.email);
  }

  /**
   * Mostrar/permitir eliminar una actividad:
   *  - "Realizado": nunca (no se borra una actividad con evidencia).
   *  - "Pendiente de Evidencia" (incluso vencida): SOLO el admin principal.
   *  - Resto de estados: reglas normales (`canModify`).
   * Espeja la autorización del backend.
   */
  canDeleteActivity(plan: ActionPlanModel, activity: ActionPlanActivityModel): boolean {
    if (activity.status === 'Realizado') return false;
    if (activity.status === 'Pendiente de Evidencia') return this.isSuperAdmin;
    return this.canModify(plan);
  }
  
  onEdit(plan: ActionPlanModel, objective: ActionPlanObjectiveModel, activity: ActionPlanActivityModel, event: Event): void {
    event.stopPropagation();
    this.edit.emit({ plan, objective, activity, event });
  }

}
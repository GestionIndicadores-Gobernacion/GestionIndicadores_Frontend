import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActionPlanService } from '../../../features/action-plans/services/action-plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { PageState, PageStateComponent } from '../../../shared/components/page-state/page-state';

export interface PlanOwner {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface UserDashboard {
  responsible: string;
  plans_owner: PlanOwner[];
  total_activities: number;
  completed: number;
  running: number;
  pending: number;
  overdue: number;
  total_score: number;
  activities_without_report: number;
  activities: ActivityDetail[];
  expanded?: boolean;
  /** Página actual del detalle expandido. Cada fila pagina independiente. */
  detailPage?: number;
}

export interface ActivityDetail {
  id: number;
  name: string;
  delivery_date: string;
  status: string;
  score: number | null;
  computed_score: number | null;
  reported_at: string | null;
  evidence_url: string | null;
  generates_report?: boolean;
  has_linked_report?: boolean;
}

@Component({
  selector: 'app-action-plan-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Pagination, LucideAngularModule, PageStateComponent],
  templateUrl: './action-plan-dashboard.html',
})
export class ActionPlanDashboardComponent implements OnInit {

  allUsers: UserDashboard[] = [];
  users: UserDashboard[] = [];
  loading = true;
  loadError = false;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    if (!this.allUsers.length) return 'empty';
    return 'content';
  }

  search = '';
  statusFilter = '';

  currentPage = 1;
  pageSize = 10;

  /** Tamaño de página del detalle de actividades por responsable. */
  readonly detailPageSize = 10;

  sortCol: string = 'completion';
  sortDir: 'asc' | 'desc' = 'desc'

  private destroyRef = inject(DestroyRef);

  constructor(
    private actionPlanService: ActionPlanService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.actionPlanService.getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allUsers = data.map(u => ({ ...u, expanded: false }));
          this.applyFilters();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    const term = this.search.toLowerCase().trim();
    this.users = this.allUsers.filter(u => {
      const matchSearch = !term ||
        u.responsible.toLowerCase().includes(term) ||
        u.plans_owner.some(o =>
          `${o.first_name} ${o.last_name}`.toLowerCase().includes(term) ||
          o.email.toLowerCase().includes(term)
        );
      const matchStatus = !this.statusFilter ||
        (this.statusFilter === 'completed' && u.completed > 0) ||
        (this.statusFilter === 'overdue' && u.overdue > 0) ||
        (this.statusFilter === 'pending' && u.pending > 0);
      return matchSearch && matchStatus;
    });

    if (this.sortCol) {
      this.users.sort((a, b) => {
        let valA: any;
        let valB: any;
        switch (this.sortCol) {
          case 'responsible': valA = a.responsible.toLowerCase(); valB = b.responsible.toLowerCase(); break;
          case 'total': valA = a.total_activities; valB = b.total_activities; break;
          case 'completed': valA = a.completed; valB = b.completed; break;
          case 'running': valA = a.total_activities - a.completed - a.overdue - a.pending;
            valB = b.total_activities - b.completed - b.overdue - b.pending; break;
          case 'pending': valA = a.pending + a.overdue; valB = b.pending + b.overdue; break;
          case 'completion': valA = this.completionRate(a); valB = this.completionRate(b); break;
          case 'score': valA = a.total_score; valB = b.total_score; break;
          case 'without_report': valA = a.activities_without_report; valB = b.activities_without_report; break;
          default: return 0;
        }
        return this.sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  sortBy(col: string): void {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  get paginatedUsers(): UserDashboard[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.users.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.users.length / this.pageSize) || 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  toggleUser(user: UserDashboard): void {
    user.expanded = !user.expanded;
    if (user.expanded && !user.detailPage) user.detailPage = 1;
    this.cdr.detectChanges();
  }

  /** Slice paginado de las actividades del responsable, según `detailPage`. */
  activitiesPage(user: UserDashboard): ActivityDetail[] {
    const page = user.detailPage ?? 1;
    const start = (page - 1) * this.detailPageSize;
    return user.activities.slice(start, start + this.detailPageSize);
  }

  activitiesTotalPages(user: UserDashboard): number {
    return Math.ceil((user.activities?.length ?? 0) / this.detailPageSize) || 1;
  }

  onDetailPageChange(user: UserDashboard, page: number): void {
    user.detailPage = page;
    this.cdr.detectChanges();
  }

  /**
   * Una actividad es "reportable" desde aquí cuando aún no se ha cerrado
   * (Realizado). La guarda real de quién puede reportar vive en el modal
   * del calendar (`canReportActivity` / backend); este flag solo controla
   * si el botón se muestra.
   */
  isReportable(act: ActivityDetail): boolean {
    return act.status === 'Pendiente'
        || act.status === 'En Ejecución'
        || act.status === 'Pendiente de Evidencia';
  }

  /**
   * Caso especial: actividad cerrada (Realizado) que genera un reporte
   * vinculado, pero el reporte aún no se ha creado. Aquí el flujo no es
   * reportar la actividad sino *crear* el reporte asociado.
   */
  needsLinkedReport(act: ActivityDetail): boolean {
    return act.status === 'Realizado'
        && !!act.generates_report
        && !act.has_linked_report;
  }

  /** Hay alguna acción "Reportar / Crear reporte" disponible. */
  hasReportAction(act: ActivityDetail): boolean {
    return this.isReportable(act) || this.needsLinkedReport(act);
  }

  reportButtonLabel(act: ActivityDetail): string {
    return this.needsLinkedReport(act) ? 'Crear reporte' : 'Reportar';
  }

  /**
   * Despacha la acción según el caso:
   *  - actividad cerrada sin reporte → /reports/new?activityId=...
   *    (formulario de creación de reporte prellenado con la actividad).
   *  - resto → /action-plans/calendar?reportActivity=... (modal de reporte).
   */
  goToReport(act: ActivityDetail): void {
    if (this.needsLinkedReport(act)) {
      this.router.navigate(['/reports/new'], {
        queryParams: { activityId: act.id },
      });
      return;
    }
    this.router.navigate(['/action-plans/calendar'], {
      queryParams: { reportActivity: act.id },
    });
  }

  completionRate(user: UserDashboard): number {
    if (!user.total_activities) return 0;
    return Math.round((user.completed / user.total_activities) * 100);
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'Realizado': 'bg-emerald-100 text-emerald-700',
      'En Ejecución': 'bg-blue-100 text-blue-700',
      'Pendiente': 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-zinc-100 text-zinc-600';
  }

  roleClass(role: string): string {
    const map: Record<string, string> = {
      'admin': 'bg-orange-100 text-orange-800',
      'editor': 'bg-blue-100 text-blue-800',
      'monitor': 'bg-purple-100 text-purple-800',
      'viewer': 'bg-zinc-100 text-zinc-700',
    };
    return map[role] ?? 'bg-zinc-100 text-zinc-600';
  }
}
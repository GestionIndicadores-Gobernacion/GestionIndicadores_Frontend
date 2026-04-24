import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuditLogModel } from '../action-plans/models/audit-log.model';
import { AuditLogService } from '../action-plans/services/audit-log.service';
import { UsersService } from '../user/services/users.service';
import { Pagination } from '../../shared/components/pagination/pagination';
import { PageState, PageStateComponent } from '../../shared/components/page-state/page-state';

interface FilterState {
  search: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
}

@Component({
  selector: 'app-audit-history',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, LucideAngularModule],
  templateUrl: './audit-history.html',
})
export class AuditHistoryComponent implements OnInit {

  logs: AuditLogModel[] = [];
  filtered: AuditLogModel[] = [];
  paginated: AuditLogModel[] = [];
  userMap: Record<number, string> = {};

  loading = true;
  loadError = false;
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    if (!this.paginated.length) return 'empty';
    return 'content';
  }

  filters: FilterState = {
    search: '',
    action: '',
    entity: '',
    dateFrom: '',
    dateTo: '',
  };

  currentPage = 1;
  readonly pageSize = 15;
  totalPages = 1;

  /** Entidades conocidas con etiqueta legible */
  readonly entityLabels: Record<string, string> = {
    report:      'Reporte',
    action_plan: 'Plan de acción',
  };

  private destroyRef = inject(DestroyRef);

  constructor(
    private auditLogService: AuditLogService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.usersService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          this.userMap = Object.fromEntries(
            users.map(u => [u.id, `${u.first_name} ${u.last_name}`])
          );
          this.loadLogs();
        },
        error: () => this.loadLogs(),
      });
  }

  loadLogs(): void {
    this.loading = true;
    this.loadError = false;
    this.auditLogService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: logs => {
          this.logs = logs;
          this.applyFilters();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.logs = [];
          this.filtered = [];
          this.paginated = [];
          this.loadError = true;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  applyFilters(): void {
    const { search, action, entity, dateFrom, dateTo } = this.filters;
    const term = search.toLowerCase().trim();

    this.filtered = this.logs.filter(log => {
      if (action && log.action !== action) return false;
      if (entity && log.entity !== entity) return false;

      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        if (new Date(log.created_at) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        if (new Date(log.created_at) > to) return false;
      }

      if (term) {
        const user = this.userName(log.user_id).toLowerCase();
        const entityLabel = this.entityLabel(log.entity).toLowerCase();
        const detail = (log.detail ?? '').toLowerCase();
        const id = log.entity_id.toString();
        if (!user.includes(term) && !entityLabel.includes(term) &&
            !detail.includes(term) && !id.includes(term)) return false;
      }

      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
    this.cdr.detectChanges();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filtered.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginated = this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.filters = { search: '', action: '', entity: '', dateFrom: '', dateTo: '' };
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.action ||
              this.filters.entity || this.filters.dateFrom || this.filters.dateTo);
  }

  /** Entidades únicas presentes en los logs */
  get availableEntities(): string[] {
    return [...new Set(this.logs.map(l => l.entity))].sort();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  userName(userId: number | null): string {
    if (userId == null) return 'Sistema';
    return this.userMap[userId] ?? `Usuario #${userId}`;
  }

  entityLabel(entity: string): string {
    return this.entityLabels[entity] ?? entity;
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      created: 'Creó',
      updated: 'Editó',
      deleted: 'Eliminó',
    };
    return map[action] ?? action;
  }

  actionBadgeClass(action: string): string {
    const map: Record<string, string> = {
      created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      updated: 'bg-blue-50 text-blue-700 border-blue-200',
      deleted: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[action] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200';
  }

  actionIconName(action: string): string {
    const map: Record<string, string> = {
      created: 'plus',
      updated: 'pencil',
      deleted: 'trash-2',
    };
    return map[action] ?? 'info';
  }

  entityIconName(entity: string): string {
    const map: Record<string, string> = {
      report: 'file-text',
      action_plan: 'clipboard-check',
    };
    return map[entity] ?? 'info';
  }

  entityBadgeClass(entity: string): string {
    const map: Record<string, string> = {
      report:      'bg-indigo-50 text-indigo-700 border-indigo-200',
      action_plan: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return map[entity] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

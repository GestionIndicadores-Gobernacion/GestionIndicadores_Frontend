import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogModel } from '../action-plans/models/audit-log.model';
import { AuditLogService } from '../action-plans/services/audit-log.service';
import { UsersService } from '../user/services/users.service';
import { Pagination } from '../../shared/components/pagination/pagination';

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
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './audit-history.html',
})
export class AuditHistoryComponent implements OnInit {

  logs: AuditLogModel[] = [];
  filtered: AuditLogModel[] = [];
  paginated: AuditLogModel[] = [];
  userMap: Record<number, string> = {};

  loading = true;
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  constructor(
    private auditLogService: AuditLogService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.usersService.getAll().subscribe({
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
    this.auditLogService.getAll().subscribe({
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

  actionIconPath(action: string): string {
    const map: Record<string, string> = {
      created: 'M12 4v16m8-8H4',
      updated: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      deleted: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    };
    return map[action] ?? 'M13 16h-1v-4h-1m1-4h.01';
  }

  entityIconPath(entity: string): string {
    const map: Record<string, string> = {
      report:      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
      action_plan: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    };
    return map[entity] ?? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  entityBadgeClass(entity: string): string {
    const map: Record<string, string> = {
      report:      'bg-indigo-50 text-indigo-700 border-indigo-200',
      action_plan: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return map[entity] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

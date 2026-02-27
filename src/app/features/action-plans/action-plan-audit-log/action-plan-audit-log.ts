import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogModel } from '../../../core/models/audit-log.model';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { UsersService } from '../../../core/services/users.service';
import { Pagination } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-action-plan-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './action-plan-audit-log.html',
  styleUrl: './action-plan-audit-log.css',
})
export class ActionPlanAuditLogComponent implements OnInit {

  logs: AuditLogModel[] = [];
  filtered: AuditLogModel[] = [];
  paginated: AuditLogModel[] = [];
  userMap: Record<number, string> = {};

  searchTerm = '';
  filterAction = '';

  currentPage = 1;
  pageSize = 3;
  totalPages = 1;

  constructor(
    private auditLogService: AuditLogService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.getAll().subscribe({
      next: users => {
        this.userMap = Object.fromEntries(
          users.map(u => [u.id, `${u.first_name} ${u.last_name}`])
        );
        this.loadLogs();
      },
      error: () => this.loadLogs()
    });
  }

  loadLogs(): void {
    this.auditLogService.getAll({ entity: 'action_plan' }).subscribe({
      next: logs => {
        this.logs = logs;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.logs = [];
        this.filtered = [];
        this.paginated = [];
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filtered = this.logs.filter(log => {
      const matchAction = !this.filterAction || log.action === this.filterAction;
      const matchTerm = !term ||
        log.entity_id.toString().includes(term) ||
        log.action.includes(term) ||
        this.userName(log.user_id).toLowerCase().includes(term) ||
        (log.detail?.toLowerCase().includes(term) ?? false);
      return matchAction && matchTerm;
    });
    this.currentPage = 1;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  applyPagination(): void {
    this.totalPages = Math.ceil(this.filtered.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginated = this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  userName(userId: number | null): string {
    if (userId === null || userId === undefined) return 'Usuario desconocido';
    return this.userMap[userId] ?? `Usuario #${userId}`;
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      created: 'Creó',
      updated: 'Editó',
      deleted: 'Eliminó',
    };
    return map[action] ?? action;
  }

  actionClass(action: string): string {
    const map: Record<string, string> = {
      created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      updated: 'bg-blue-50 text-blue-700 border-blue-200',
      deleted: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[action] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200';
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      created: 'M12 4v16m8-8H4',
      updated: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      deleted: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    };
    return map[action] ?? 'M13 16h-1v-4h-1m1-4h.01';
  }
}
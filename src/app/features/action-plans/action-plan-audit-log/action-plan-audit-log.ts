import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuditLogModel } from '../../../features/action-plans/models/audit-log.model';
import { AuditLogService } from '../../../features/action-plans/services/audit-log.service';
import { UsersService } from '../../../features/user/services/users.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { PageState, PageStateComponent } from '../../../shared/components/page-state/page-state';

@Component({
  selector: 'app-action-plan-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, LucideAngularModule, PageStateComponent],
  templateUrl: './action-plan-audit-log.html',
  styleUrl: './action-plan-audit-log.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionPlanAuditLogComponent implements OnInit {

  logs: AuditLogModel[] = [];
  filtered: AuditLogModel[] = [];
  paginated: AuditLogModel[] = [];
  userMap: Record<number, string> = {};

  loading = true;
  loadError = false;

  searchTerm = '';
  filterAction = '';

  currentPage = 1;
  pageSize = 3;
  totalPages = 1;

  get pageState(): PageState {
    if (this.loading) return 'loading';
    if (this.loadError) return 'error';
    if (!this.logs.length) return 'empty';
    return 'content';
  }

  private destroyRef = inject(DestroyRef);

  constructor(
    private auditLogService: AuditLogService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    this.loading = true;
    this.loadError = false;
    this.auditLogService.getAll({ entity: 'action_plan' })
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
      created: 'plus',
      updated: 'pencil',
      deleted: 'trash-2',
    };
    return map[action] ?? 'info';
  }
}
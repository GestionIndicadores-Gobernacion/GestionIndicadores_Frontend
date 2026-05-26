import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuditLogModel } from '../action-plans/models/audit-log.model';
import { AuditLogService } from '../action-plans/services/audit-log.service';
import { UsersService } from '../user/services/users.service';
import { Pagination } from '../../shared/components/pagination/pagination';
import { PageState } from '../../shared/components/page-state/page-state';
import {
  AuditDetailRolePermissions,
  AuditDetailUserOverrides,
  parseAuditDetail,
  parseUserOverridesAuditDetail,
} from './utils/parse-audit-detail';

interface FilterState {
  search: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
}

/** Opción explícita del dropdown de entidades, en el orden en que se renderiza. */
interface EntityOption {
  /** Valor enviado al backend / aplicado al filtro. */
  value: string;
  /** Etiqueta visible al usuario. */
  label: string;
}

@Component({
  selector: 'app-audit-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Pagination, LucideAngularModule],
  templateUrl: './audit-history.html',
})
export class AuditHistoryComponent implements OnInit {

  logs: AuditLogModel[] = [];
  filtered: AuditLogModel[] = [];
  paginated: AuditLogModel[] = [];
  userMap: Record<number, string> = {};

  /**
   * Snapshot inmutable de las entidades desconocidas presentes en `logs`.
   * Lo poblamos en `loadLogs()` (no como getter) para evitar que el template
   * cree un array distinto en cada ciclo de change-detection — eso dispararía
   * NG0103 (infinite change detection) cuando `extraEntityOptions` se usa con
   * `*ngFor`.
   */
  extraEntityOptions: EntityOption[] = [];

  loading = true;
  loadError = false;
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /** IDs de logs cuyo detalle está expandido (solo aplica a role_permissions). */
  private expandedIds = new Set<number>();

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

  /** Entidades conocidas con etiqueta legible. */
  readonly entityLabels: Record<string, string> = {
    report:                     'Reporte',
    action_plan:                'Plan de acción',
    role_permissions:           'Permisos de rol',
    user_permission_overrides:  'Overrides',
  };

  /**
   * Opciones explícitas del select de entidades. Mantienen el orden
   * canónico independiente de qué entities estén presentes en `logs`.
   * Cualquier entity desconocida que aparezca en los logs se anexa al
   * final via `extraEntityOptions` (fallback dinámico).
   */
  readonly entityOptions: EntityOption[] = [
    { value: 'report',                    label: 'Reportes' },
    { value: 'action_plan',               label: 'Planes de acción' },
    { value: 'role_permissions',          label: 'Cambios de permisos por rol' },
    { value: 'user_permission_overrides', label: 'Cambios de overrides por usuario' },
  ];

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
          this.recomputeExtraEntityOptions();
          this.applyFilters();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.logs = [];
          this.filtered = [];
          this.paginated = [];
          this.extraEntityOptions = [];
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

  /**
   * Recalcula `extraEntityOptions` a partir de la lista actual de logs.
   * Se ejecuta tras cargar los logs; el resultado es inmutable hasta el
   * próximo reload, lo que evita ciclos de change-detection desde el template.
   */
  private recomputeExtraEntityOptions(): void {
    const known = new Set(this.entityOptions.map(o => o.value));
    const present = new Set(this.logs.map(l => l.entity));
    this.extraEntityOptions = [...present]
      .filter(e => !!e && !known.has(e))
      .sort()
      .map(e => ({ value: e, label: this.entityLabel(e) }));
  }

  // ─── Detalle expandible (role_permissions / user_permission_overrides) ─────

  /** Devuelve el detalle tipado si el log es role_permissions con shape válida. */
  rolePermDetail(log: AuditLogModel): AuditDetailRolePermissions | null {
    return parseAuditDetail(log.entity, log.detail);
  }

  /** Devuelve el detalle tipado si el log es user_permission_overrides con shape válida. */
  userOverridesDetail(log: AuditLogModel): AuditDetailUserOverrides | null {
    return parseUserOverridesAuditDetail(log.entity, log.detail);
  }

  /**
   * Filtra `added` por effect específico. Útil para separar los chips
   * "grants" de "revokes" en la fila colapsada y en el detalle expandido.
   */
  filterByEffect(
    items: AuditDetailUserOverrides['added'],
    effect: 'grant' | 'revoke',
  ): AuditDetailUserOverrides['added'] {
    return items.filter(i => i.effect === effect);
  }

  /** Toggle del estado expandido de un log puntual. */
  toggleExpanded(log: AuditLogModel): void {
    if (this.expandedIds.has(log.id)) {
      this.expandedIds.delete(log.id);
    } else {
      this.expandedIds.add(log.id);
    }
    this.cdr.detectChanges();
  }

  isExpanded(log: AuditLogModel): boolean {
    return this.expandedIds.has(log.id);
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
      report:                    'file-text',
      action_plan:               'clipboard-check',
      role_permissions:          'shield-check',
      user_permission_overrides: 'user-cog',
    };
    return map[entity] ?? 'info';
  }

  /**
   * Ruta de destino para el registro auditado, o `null` si la entidad no
   * tiene pantalla navegable. El template usa `null` para renderizar el ID
   * como texto plano.
   */
  recordLink(log: AuditLogModel): any[] | null {
    switch (log.entity) {
      case 'report':                    return ['/reports', log.entity_id];
      case 'action_plan':               return ['/action-plans/calendar'];
      case 'role_permissions':          return ['/admin/roles', log.entity_id];
      case 'user_permission_overrides': return ['/users', log.entity_id, 'edit'];
      default:                          return null;
    }
  }

  /** Query params asociados al destino de `recordLink`. */
  recordQueryParams(log: AuditLogModel): Record<string, any> | null {
    return log.entity === 'action_plan' ? { planId: log.entity_id } : null;
  }

  entityBadgeClass(entity: string): string {
    const map: Record<string, string> = {
      report:                    'bg-indigo-50 text-indigo-700 border-indigo-200',
      action_plan:               'bg-purple-50 text-purple-700 border-purple-200',
      role_permissions:          'bg-amber-50 text-amber-800 border-amber-200',
      user_permission_overrides: 'bg-violet-50 text-violet-800 border-violet-200',
    };
    return map[entity] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

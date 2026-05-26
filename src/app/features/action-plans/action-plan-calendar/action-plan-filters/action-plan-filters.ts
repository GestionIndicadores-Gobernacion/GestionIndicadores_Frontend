import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActionPlanStatus } from '../../../../features/action-plans/models/action-plan.model';
import { StrategyModel } from '../../../../features/report/models/strategy.model';
import { ComponentModel } from '../../../../features/report/models/component.model';
import { UserResponse } from '../../../../features/user/models/user.model';

/**
 * Cuentas de sistema, semilla y pruebas que no deben aparecer como
 * responsables en el filtro del calendario. La lista vive aquí (no en un
 * módulo global) porque el criterio es específico de este caso de uso:
 * los responsables reales son colaboradores nominales, no cuentas
 * técnicas. Mismo enfoque que `EXCLUDED_EMAILS` en el modal de edición
 * de planes (`action-plan-edit-plan-modal`).
 */
const EXCLUDED_RESPONSIBLE_EMAILS = new Set<string>([
  'admin@gobernacion.gov.co',
  'editor@gobernacion.gov.co',
  'editor@indicadorespyba.cloud',
  'milo@gmail.com',
  'monitor@gmail.com',
  'publico@indicadorespyba.cloud',
  'viewer@gobernacion.gov.co',
]);

@Component({
  selector: 'app-action-plan-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './action-plan-filters.html',
})
export class ActionPlanFiltersComponent {

  @Input() strategies: StrategyModel[] = [];
  @Input() filteredComponents: ComponentModel[] = [];
  @Input() selectedStrategyId: number | null = null;
  @Input() activeStatusFilter: 'all' | ActionPlanStatus = 'all';
  @Input() filterByBoss = false;
  @Input() filteredPlansCount = 0;
  @Input() selectedDayFilter: Date | null = null;

  @Output() strategyChange = new EventEmitter<number | null>();
  @Output() componentChange = new EventEmitter<number | null>();
  @Output() statusChange = new EventEmitter<'all' | ActionPlanStatus>();
  @Output() bossChange = new EventEmitter<boolean>();
  @Output() clearDayFilter = new EventEmitter<void>();

  @Input() filterMyPlans = false;
  @Output() myPlansChange = new EventEmitter<boolean>();

  // ── Filtros nuevos ───────────────────────────────────────────────
  @Input() searchTerm = '';
  @Output() searchChange = new EventEmitter<string>();

  @Input() users: UserResponse[] = [];
  @Input() selectedResponsibleIds: number[] = [];
  @Output() responsibleIdsChange = new EventEmitter<number[]>();

  @Input() generatesReportFilter: 'all' | 'yes' | 'no' = 'all';
  @Output() generatesReportChange = new EventEmitter<'all' | 'yes' | 'no'>();

  @Input() deliveryDateFrom: string | null = null;
  @Input() deliveryDateTo: string | null = null;
  @Output() deliveryDateFromChange = new EventEmitter<string | null>();
  @Output() deliveryDateToChange = new EventEmitter<string | null>();

  @Input() hasActiveFilters = false;
  @Output() clearAll = new EventEmitter<void>();

  onStrategyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.strategyChange.emit(val ? +val : null);
  }

  onComponentChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.componentChange.emit(val ? +val : null);
  }

  /** Usuarios disponibles para agregar (no ya seleccionados, ordenados A→Z). */
  get availableUsers(): UserResponse[] {
    const sel = new Set(this.selectedResponsibleIds);
    return this.users
      .filter(u => !sel.has(u.id))
      .filter(u => !this.isExcluded(u))
      .sort((a, b) =>
        this.userDisplayName(a).localeCompare(
          this.userDisplayName(b),
          'es',
          { sensitivity: 'base' },   // ignora acentos y mayúsculas para que el orden sea predecible
        ),
      );
  }

  /**
   * Determina si un usuario debe ocultarse del filtro: cuentas semilla
   * (por email), el admin principal (flag) y usuarios desactivados — no
   * tiene sentido filtrar por alguien que ya no opera.
   */
  private isExcluded(u: UserResponse): boolean {
    if (u.is_main_admin) return true;
    if (u.is_active === false) return true;
    return EXCLUDED_RESPONSIBLE_EMAILS.has((u.email ?? '').toLowerCase());
  }

  /** Usuarios actualmente seleccionados (en el orden en que se añadieron). */
  get selectedUsers(): UserResponse[] {
    const byId = new Map(this.users.map(u => [u.id, u]));
    return this.selectedResponsibleIds
      .map(id => byId.get(id))
      .filter((u): u is UserResponse => !!u);
  }

  onAddResponsible(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const id = +target.value;
    if (!id) return;
    this.responsibleIdsChange.emit([...this.selectedResponsibleIds, id]);
    target.value = '';   // reset del select
  }

  onRemoveResponsible(id: number): void {
    this.responsibleIdsChange.emit(this.selectedResponsibleIds.filter(x => x !== id));
  }

  userDisplayName(u: UserResponse): string {
    return `${u.first_name} ${u.last_name}`.trim() || u.email;
  }
}
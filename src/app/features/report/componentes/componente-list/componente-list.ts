import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentModel } from '../../../../core/models/component.model';
import { StrategyModel } from '../../../../core/models/strategy.model';

import { ComponentsService } from '../../../../core/services/components.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';

import { Pagination } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-component-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './componente-list.html',
  styleUrl: './componente-list.css',
})
export class ComponentesListComponent implements OnInit {

  components: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];

  strategyMap: Record<number, string> = {};

  loading = false;
  search = '';

  currentPage = 1;
  pageSize = 8;

  sortColumn: keyof ComponentModel | 'strategy' | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  // =========================
  // LOAD DATA
  // =========================
  load(): void {
    this.loading = true;

    this.strategiesService.getAll().subscribe({
      next: (strategies: StrategyModel[]) => {

        this.strategyMap = {};
        strategies.forEach(s => {
          this.strategyMap[s.id] = s.name;
        });

        this.componentsService.getAll().subscribe({
          next: (components) => {
            this.components = components;
            this.filteredComponents = components;
            this.loading = false;
          },
          error: () => {
            this.toast.error('Error al cargar componentes');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.toast.error('Error al cargar estrategias');
        this.loading = false;
      }
    });
  }

  // =========================
  // FILTER
  // =========================
  applyFilter(): void {

    const term = this.search.toLowerCase().trim();

    this.filteredComponents = this.components.filter(c => {
      const strategyName =
        this.strategyMap[c.strategy_id]?.toLowerCase() || '';

      return (
        c.name.toLowerCase().includes(term) ||
        strategyName.includes(term)
      );
    });

    this.currentPage = 1;
  }

  // =========================
  // SORT
  // =========================
  sortBy(column: keyof ComponentModel | 'strategy'): void {

    if (this.sortColumn === column) {
      this.sortDirection =
        this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedComponents(): ComponentModel[] {

    if (!this.sortColumn) return this.filteredComponents;

    return [...this.filteredComponents].sort((a, b) => {

      let valA: any;
      let valB: any;

      if (this.sortColumn === 'strategy') {
        valA = this.strategyMap[a.strategy_id] || '';
        valB = this.strategyMap[b.strategy_id] || '';
      }
      else if (this.sortColumn === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      }
      else {
        valA = (a as any)[this.sortColumn] || '';
        valB = (b as any)[this.sortColumn] || '';
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc'
          ? valA - valB
          : valB - valA;
      }

      return this.sortDirection === 'asc'
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });
  }

  // =========================
  // PAGINATION
  // =========================
  get paginatedComponents(): ComponentModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedComponents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(
      Math.ceil(this.sortedComponents.length / this.pageSize),
      1
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  // =========================
  // NAVIGATION
  // =========================
  goToCreate(): void {
    this.router.navigate(['/reports/components/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate([`/reports/components/${id}/edit`]);
  }

  // =========================
  // DELETE
  // =========================
  deleteComponent(id: number): void {

    this.toast.confirm(
      '¿Eliminar componente?',
      'Esta acción no se puede deshacer.'
    ).then(result => {

      if (!result.isConfirmed) return;

      this.componentsService.delete(id).subscribe({
        next: () => {
          this.toast.success('Componente eliminado correctamente');
          this.load();
        },
        error: err => {
          this.toast.error(
            err.error?.message || 'Error al eliminar componente'
          );
        }
      });
    });
  }
}

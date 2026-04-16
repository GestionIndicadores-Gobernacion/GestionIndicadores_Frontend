import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentModel } from '../../../../features/report/models/component.model';
import { StrategyModel } from '../../../../features/report/models/strategy.model';

import { ComponentsService } from '../../../../features/report/services/components.service';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';

import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PublicPolicyModalComponent } from './public-policy-modal/public-policy-modal';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-component-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, PublicPolicyModalComponent, LucideAngularModule],
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
    private toast: ToastService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.load();
  }

  showPoliciesModal = false;
  openPoliciesModal(): void { this.showPoliciesModal = true; }
  closePoliciesModal(): void { this.showPoliciesModal = false; }

  // =========================
  // LOAD DATA
  // =========================
  load(): void {
    this.loading = true;
    this.cd.detectChanges();

    this.strategiesService.getAll().subscribe({
      next: (strategies: StrategyModel[]) => {

        this.strategyMap = {};
        strategies.forEach(s => {
          this.strategyMap[s.id] = s.name;
        });

        this.componentsService.getAll().subscribe({
          next: (components) => {
            this.components = components ?? [];
            this.filteredComponents = components ?? [];
            this.loading = false;
            this.cd.detectChanges();
          },
          error: () => {
            this.toast.error('Error al cargar componentes');
            this.loading = false;
            this.cd.detectChanges();
          }
        });
      },
      error: () => {
        this.toast.error('Error al cargar estrategias');
        this.loading = false;
        this.cd.detectChanges();
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
        c.name?.toLowerCase().includes(term) ||
        strategyName.includes(term)
      );
    });

    this.currentPage = 1;
    this.cd.detectChanges();
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

    this.cd.detectChanges();
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
    this.cd.detectChanges();
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
          this.cd.detectChanges();
        }
      });
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StrategyModel } from '../../../core/models/strategy.model';
import { StrategiesService } from '../../../core/services/strategy.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-strategy-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './strategy-list.html',
  styleUrl: './strategy-list.css',
})
export class StrategyListComponent implements OnInit {

  strategies: StrategyModel[] = [];
  filteredStrategies: StrategyModel[] = [];

  loading = true;
  search = '';

  // PAGINACIÓN
  currentPage = 1;
  pageSize = 8;

  // ORDENAMIENTO
  sortColumn: keyof StrategyModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;

    this.strategiesService.getAll().subscribe({
      next: (res) => {
        this.strategies = res;
        this.filteredStrategies = res;
        this.loading = false;
      },
      error: () => {
        alert('Error cargando estrategias');
        this.loading = false;
      },
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredStrategies = this.strategies.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.description || '').toLowerCase().includes(term)
    );
  }

  // ORDENAMIENTO
  sortBy(column: keyof StrategyModel) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedStrategies(): StrategyModel[] {
    if (!this.sortColumn) return this.filteredStrategies;

    return [...this.filteredStrategies].sort((a: any, b: any) => {
      const valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
      const valB = (b[this.sortColumn] ?? '').toString().toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedStrategies(): StrategyModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedStrategies.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedStrategies.length / this.pageSize);
  }

  // NAVEGACIÓN
  goToCreate() {
    this.router.navigate(['/dashboard/strategies/create']);
  }

  goToEdit(id: number) {
    this.router.navigate([`/dashboard/strategies/${id}/edit`]);
  }
  deleteStrategy(id: number) {
    this.toast
      .confirm(
        "¿Eliminar estrategia?",
        "Esta acción no se puede deshacer."
      )
      .then(result => {
        if (result.isConfirmed) {

          this.strategiesService.delete(id).subscribe({
            next: () => {
              this.toast.success("Estrategia eliminada correctamente");
              this.load(); // refrescar la lista
            },
            error: () => {
              this.toast.error("Error al eliminar la estrategia");
            }
          });

        }
      });
  }

}

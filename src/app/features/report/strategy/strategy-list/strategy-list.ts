import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { StrategyModel } from '../../../../core/models/strategy.model';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Pagination } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-strategy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './strategy-list.html',
  styleUrl: './strategy-list.css',
})
export class StrategyListComponent implements OnInit {

  strategies: StrategyModel[] = [];
  filteredStrategies: StrategyModel[] = [];
  paginatedStrategies: StrategyModel[] = [];

  loading = false;
  error: string | null = null;

  // búsqueda
  searchTerm = '';

  // paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // SORTING
  sortColumn: keyof StrategyModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';


  constructor(
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadStrategies();
  }

  // =========================
  // LOAD
  // =========================
  loadStrategies(): void {
    this.loading = true;
    this.error = null;

    this.strategiesService.getAll().subscribe({
      next: (data) => {
        this.strategies = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las estrategias';
        this.loading = false;
      }
    });
  }

  // =========================
  // SEARCH
  // =========================
  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // =========================
  // FILTER + PAGINATION
  // =========================
  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredStrategies = this.strategies.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.objective.toLowerCase().includes(term) ||
      s.product_goal_description.toLowerCase().includes(term)
    );

    this.totalPages = Math.max(
      Math.ceil(this.sortedStrategies.length / this.pageSize),
      1
    );



    this.applyPagination();
  }

  sortBy(column: keyof StrategyModel): void {

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applyPagination(); // reordenar vista actual
  }

  get sortedStrategies(): StrategyModel[] {

    if (!this.sortColumn) return this.filteredStrategies;

    return [...this.filteredStrategies].sort((a: any, b: any) => {

      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];

      if (valA == null) return -1;
      if (valB == null) return 1;

      // números (total_goal)
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // fechas
      if (this.sortColumn === 'created_at') {
        const dA = new Date(valA).getTime();
        const dB = new Date(valB).getTime();
        return this.sortDirection === 'asc' ? dA - dB : dB - dA;
      }

      // texto
      const textA = valA.toString().toLowerCase();
      const textB = valB.toString().toLowerCase();

      return this.sortDirection === 'asc'
        ? textA.localeCompare(textB)
        : textB.localeCompare(textA);
    });
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.paginatedStrategies = this.sortedStrategies.slice(start, end);
  }


  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  // =========================
  // NAVIGATION
  // =========================
  goToCreate(): void {
    this.router.navigate(['/reports/strategies/create']);
  }

  goToEdit(id: number): void {
    this.router.navigate([`/reports/strategies/${id}/edit`]);
  }

  // =========================
  // DELETE
  // =========================
  deleteStrategy(id: number): void {
    this.toast
      .confirm('¿Eliminar estrategia?', 'Esta acción no se puede deshacer.')
      .then(result => {
        if (!result.isConfirmed) return;

        this.strategiesService.delete(id).subscribe({
          next: () => {
            this.toast.success('Estrategia eliminada correctamente');
            this.loadStrategies();
          },
          error: () => {
            this.toast.error('No se pudo eliminar la estrategia');
          }
        });
      });
  }
}

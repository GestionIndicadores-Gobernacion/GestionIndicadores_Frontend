import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-indicators-list',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './indicators-list.html',
  styleUrl: './indicators-list.css',
})
export class IndicatorsListComponent {

  // PAGINACIÓN ---------------------
  currentPage = 1;
  pageSize = 8;

  // ORDENAMIENTO -------------------
  sortColumn: keyof IndicatorModel | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  indicators: IndicatorModel[] = [];
  filteredIndicators: IndicatorModel[] = [];
  loading = true;
  search = '';

  constructor(
    private indicatorsService: IndicatorsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.indicatorsService.getAll().subscribe({
      next: (res) => {
        this.indicators = res;
        this.filteredIndicators = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Error al cargar los indicadores');
      },
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();
    this.filteredIndicators = this.indicators.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.data_type.toLowerCase().includes(term)
    );
  }

  goCreate() {
    this.router.navigate(['/dashboard/indicators/create']);
  }

  goEdit(id: number) {
    this.router.navigate([`/dashboard/indicators/${id}/edit`]);
  }

  get sortedIndicators(): IndicatorModel[] {
    if (!this.sortColumn) return this.filteredIndicators;

    return [...this.filteredIndicators].sort((a: any, b: any) => {
      const valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
      const valB = (b[this.sortColumn] ?? '').toString().toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedIndicators(): IndicatorModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedIndicators.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedIndicators.length / this.pageSize);
  }

  sortBy(column: keyof IndicatorModel) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  deleteIndicator(id: number) {
    if (!confirm('¿Desea eliminar este indicador?')) return;

    this.indicatorsService.delete(id).subscribe({
      next: () => this.load(),
      error: () => alert('Error al eliminar el indicador'),
    });
  }
}

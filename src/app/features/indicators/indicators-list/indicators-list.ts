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

  deleteIndicator(id: number) {
    if (!confirm('¿Desea eliminar este indicador?')) return;

    this.indicatorsService.delete(id).subscribe({
      next: () => this.load(),
      error: () => alert('Error al eliminar el indicador'),
    });
  }
}

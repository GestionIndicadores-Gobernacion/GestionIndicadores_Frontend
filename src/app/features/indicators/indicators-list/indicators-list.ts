import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IndicatorModel } from '../../../core/models/indicator.model';

import { IndicatorsService } from '../../../core/services/indicators.service';
import { ComponentsService } from '../../../core/services/components.service';
import { StrategiesService } from '../../../core/services/strategy.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-indicators-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './indicators-list.html',
  styleUrls: ['./indicators-list.css'],
})
export class IndicatorsListComponent {

  // PAGINACIÓN
  currentPage = 1;
  pageSize = 8;

  // ORDENAMIENTO
  sortColumn: 'name' | 'data_type' | 'active' | 'component' | 'strategy' | '' = '';

  sortDirection: 'asc' | 'desc' = 'asc';

  indicators: IndicatorModel[] = [];
  filteredIndicators: IndicatorModel[] = [];

  loading = true;
  search = '';

  // MAPS PARA MOSTRAR NOMBRES
  componentMap: Record<number, string> = {};
  strategyMap: Record<number, string> = {};
  componentStrategyMap: Record<number, number> = {};

  constructor(
    private indicatorsService: IndicatorsService,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService,
    private router: Router,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;

    Promise.all([
      this.componentsService.getAll().toPromise(),
      this.strategiesService.getAll().toPromise(),
      this.indicatorsService.getAll().toPromise(),
    ])
      .then(([components = [], strategies = [], indicators = []]) => {

        // MAPS
        components.forEach((c) => {
          this.componentMap[c.id] = c.name;
          this.componentStrategyMap[c.id] = c.activity_id;
        });

        strategies.forEach((s) => {
          this.strategyMap[s.id] = s.name;
        });

        this.indicators = indicators;
        this.filteredIndicators = indicators;

        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
        alert('Error cargando los datos');
      });
  }

  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredIndicators = this.indicators.filter((i) => {
      const compName = this.componentMap[i.component_id]?.toLowerCase() || '';
      const stratId = this.componentStrategyMap[i.component_id];
      const stratName = this.strategyMap[stratId]?.toLowerCase() || '';

      return (
        i.name.toLowerCase().includes(term) ||
        i.data_type.toLowerCase().includes(term) ||
        compName.includes(term) ||
        stratName.includes(term)
      );
    });

    this.currentPage = 1;
  }

  goCreate() {
    this.router.navigate(['/dashboard/indicators/create']);
  }

  goEdit(id: number) {
    this.router.navigate([`/dashboard/indicators/${id}/edit`]);
  }

  get sortedIndicators(): IndicatorModel[] {
    if (!this.sortColumn) return this.filteredIndicators;

    return [...this.filteredIndicators].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (this.sortColumn) {

        case 'component':
          valA = this.componentMap[a.component_id]?.toLowerCase() || '';
          valB = this.componentMap[b.component_id]?.toLowerCase() || '';
          break;

        case 'strategy':
          const stratA = this.componentStrategyMap[a.component_id];
          const stratB = this.componentStrategyMap[b.component_id];

          valA = this.strategyMap[stratA]?.toLowerCase() || '';
          valB = this.strategyMap[stratB]?.toLowerCase() || '';
          break;

        default:
          // sortColumn is guaranteed to be one of the IndicatorModel keys here (non-empty),
          // cast to keyof IndicatorModel to satisfy TypeScript when indexing.
          const key = this.sortColumn as keyof IndicatorModel;
          valA = ((a[key] ?? '')).toString().toLowerCase();
          valB = ((b[key] ?? '')).toString().toLowerCase();
          break;
      }

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

  sortBy(column: 'name' | 'data_type' | 'active' | 'component' | 'strategy') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  deleteIndicator(id: number) {
    this.toast
      .confirm(
        "¿Eliminar indicador?",
        "Esta acción no se puede deshacer."
      )
      .then(result => {
        if (!result.isConfirmed) return;

        this.indicatorsService.delete(id).subscribe({
          next: () => {
            this.toast.success("Indicador eliminado correctamente");
            this.load();
          },
          error: (err) => {
            console.log("🔥 ERROR DELETE INDICATOR:", err);

            const msg =
              err.error?.message ||
              err.error?.msg ||
              err.error?.description ||
              "Error al eliminar el indicador";

            this.toast.error(msg);
          }
        });
      });
  }

}

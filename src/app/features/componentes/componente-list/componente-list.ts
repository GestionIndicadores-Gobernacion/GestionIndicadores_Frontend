import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { ComponentsService } from '../../../core/services/components.service';
import { StrategyModel } from '../../../core/models/strategy.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StrategiesService } from '../../../core/services/strategy.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-componente-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './componente-list.html',
  styleUrl: './componente-list.css',
})
export class ComponentesListComponent implements OnInit {

  componentes: ComponentModel[] = [];
  filteredComponents: ComponentModel[] = [];

  strategies: StrategyModel[] = [];
  strategyMap: Record<number, string> = {};

  loading = true;
  search = '';

  // Pag.
  currentPage = 1;
  pageSize = 8;

  // Sort.
  sortColumn: keyof ComponentModel | '' = '';
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

  load() {
    this.loading = true;

    // Cargar estrategias y luego componentes
    this.strategiesService.getAll().subscribe({
      next: strategies => {
        this.strategies = strategies;
        this.strategyMap = Object.fromEntries(strategies.map(s => [s.id, s.name]));

        this.componentsService.getAll().subscribe({
          next: comps => {
            this.componentes = comps;
            this.filteredComponents = comps;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            alert('Error al cargar los componentes');
          }
        });
      },
      error: () => {
        alert('Error al cargar estrategias');
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const term = this.search.toLowerCase();

    this.filteredComponents = this.componentes.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.description || '').toLowerCase().includes(term) ||
      (this.strategyMap[c.strategy_id] || '').toLowerCase().includes(term)
    );
  }

  goToCreate() {
    this.router.navigate(['/dashboard/components/create']);
  }

  goToEdit(id: number) {
    this.router.navigate([`/dashboard/components/${id}/edit`]);
  }

  sortBy(column: keyof ComponentModel) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  get sortedComponents(): ComponentModel[] {
    if (!this.sortColumn) return this.filteredComponents;

    return [...this.filteredComponents].sort((a: any, b: any) => {
      const valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
      const valB = (b[this.sortColumn] ?? '').toString().toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedComponents(): ComponentModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedComponents.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedComponents.length / this.pageSize);
  }

  deleteComponent(id: number) {
  this.toast
    .confirm(
      "¿Eliminar componente?",
      "Esta acción no se puede deshacer."
    )
    .then(result => {
      if (!result.isConfirmed) return;

      this.componentsService.delete(id).subscribe({
        next: () => {
          this.toast.success("Componente eliminado correctamente");
          this.load();
        },
        error: (err) => {
          console.log("🔥 ERROR DELETE COMPONENT:", err);

          const msg =
            err.error?.message ||     // Mensaje backend tipo {"message": "..."}
            err.error?.msg ||
            err.error?.description ||
            "Error al eliminar el componente";

          this.toast.error(msg);
        }
      });
    });
}


}

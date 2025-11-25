import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RecordModel } from '../../../core/models/record.model';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { RecordsService } from '../../../core/services/records.service';

@Component({
  selector: 'app-records-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe
  ],
  templateUrl: './records-list.html',
  styleUrl: './records-list.css',
})
export class RecordsListComponent {

  // PAGINACIÓN ---------------------
  currentPage = 1;
  pageSize = 10; // acá suelen ser más registros, podés subirlo a 20

  // ORDENAMIENTO -------------------
  sortColumn: keyof RecordModel | "component" | "indicator" | "" = "";
  sortDirection: "asc" | "desc" = "asc";

  records: RecordModel[] = [];
  filteredRecords: RecordModel[] = [];

  loading = true;

  search = '';

  isViewer = false;
  user: any = null;

  // Diccionarios para mostrar nombre (no solo ID)
  componentMap: Record<number, string> = {};
  indicatorMap: Record<number, string> = {};

  constructor(
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService
  ) {
    const userString = localStorage.getItem('user');
    if (userString) {
      this.user = JSON.parse(userString);

      this.isViewer = this.user.role?.name === 'Viewer';
    }
  }

  ngOnInit(): void {
    this.loadMaps();
  }

  // 1️⃣ Cargar mapas y luego los records
  loadMaps() {
    this.componentsService.getAll().subscribe({
      next: comps => {
        this.componentMap = Object.fromEntries(
          comps.map(c => [c.id, c.name])
        );

        this.indicatorsService.getAll().subscribe({
          next: inds => {
            this.indicatorMap = Object.fromEntries(
              inds.map(i => [i.id, i.name])
            );

            this.loadRecords();
          }
        });
      }
    });
  }

  // 2️⃣ Cargar registros
  loadRecords() {
    this.recordsService.getAll().subscribe({
      next: res => {
        this.records = res;
        this.filteredRecords = res;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  // 3️⃣ Filtro básico estilo Users
  applyFilter() {
    const term = this.search.toLowerCase().trim();

    this.filteredRecords = this.records.filter(r =>
      (this.componentMap[r.component_id ?? 0] || '').toLowerCase().includes(term) ||
      (this.indicatorMap[r.indicator_id ?? 0] || '').toLowerCase().includes(term) ||
      r.municipio.toLowerCase().includes(term)
    );
  }

  get sortedRecords(): RecordModel[] {
    if (!this.sortColumn) return this.filteredRecords;

    return [...this.filteredRecords].sort((a: any, b: any) => {

      let valA: string | number = '';
      let valB: string | number = '';

      // Campos especiales que vienen de mapas
      if (this.sortColumn === 'component') {
        valA = (this.componentMap[a.component_id ?? 0] || '').toLowerCase();
        valB = (this.componentMap[b.component_id ?? 0] || '').toLowerCase();
      }
      else if (this.sortColumn === 'indicator') {
        valA = (this.indicatorMap[a.indicator_id ?? 0] || '').toLowerCase();
        valB = (this.indicatorMap[b.indicator_id ?? 0] || '').toLowerCase();
      }
      else if (this.sortColumn === 'fecha') {
        valA = new Date(a.fecha).getTime();
        valB = new Date(b.fecha).getTime();
      }
      else {
        valA = (a[this.sortColumn] ?? '').toString().toLowerCase();
        valB = (b[this.sortColumn] ?? '').toString().toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get paginatedRecords(): RecordModel[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedRecords.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.sortedRecords.length / this.pageSize);
  }

  sortBy(column: keyof RecordModel | 'component' | 'indicator') {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  deleteRecord(id: number) {
    if (!confirm("¿Seguro que desea eliminar este registro?")) return;

    this.loading = true;

    this.recordsService.delete(id).subscribe({
      next: () => {
        // recargar lista
        this.loadRecords();
      },
      error: (err) => {
        this.loading = false;
        alert("Error eliminando el registro");
        console.error(err);
      }
    });
  }

}

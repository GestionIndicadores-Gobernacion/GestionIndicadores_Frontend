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
  records: RecordModel[] = [];
  filteredRecords: RecordModel[] = [];

  loading = true;

  search = '';

  // Diccionarios para mostrar nombre (no solo ID)
  componentMap: Record<number, string> = {};
  indicatorMap: Record<number, string> = {};

  constructor(
    private recordsService: RecordsService,
    private componentsService: ComponentsService,
    private indicatorsService: IndicatorsService
  ) { }

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

import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Dataset } from '../../../../features/datasets/models/dataset.model';
import { Field } from '../../../../features/datasets/models/field.model';
import { Table } from '../../../../features/datasets/models/table.model';
import { DatasetService } from '../../../../features/datasets/services/datasets.service';
import { FieldService } from '../../../../features/datasets/services/field.service';
import { RecordService } from '../../../../features/datasets/services/record.service';
import { TableService } from '../../../../features/datasets/services/table.service';


interface TableStats {
  table: Table;
  datasetName: string;
  fieldsCount: number;
  recordsCount: number;
  fieldTypes: string[];
}

type SortOption = 'name' | 'records' | 'fields';

@Component({
  selector: 'app-tables-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tables-list.html',
  styleUrls: ['./tables-list.css']
})
export class TablesListComponent implements OnInit, OnChanges {

  /**
   * Pasado desde DatasetsListComponent.
   * Si es false, no mostramos "Cargando..." sino directamente el empty state.
   */
  @Input() hasDatasets = true;

  /**
   * Cada vez que este número cambia, la lista de tablas se recarga.
   * DatasetsListComponent lo incrementa después de importar o eliminar.
   */
  @Input() refreshTrigger = 0;

  tablesStats = signal<TableStats[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  search = signal('');
  sortBy = signal<SortOption>('name');
  fieldTypeFilter = signal<string | null>(null);

  constructor(
    private tableService: TableService,
    private fieldService: FieldService,
    private recordService: RecordService,
    private datasetService: DatasetService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (this.hasDatasets) {
      this.loadTables();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recargar cuando refreshTrigger cambia (después de import/delete)
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      if (this.hasDatasets) {
        this.loadTables();
      } else {
        // No hay datasets → limpiar lista sin llamar al servidor
        this.tablesStats.set([]);
      }
    }

    // Si hasDatasets pasa de false → true, cargar
    if (changes['hasDatasets'] && changes['hasDatasets'].currentValue === true) {
      this.loadTables();
    }
  }

  // =========================
  // LOAD
  // =========================
  private loadTables(): void {
    this.loading.set(true);

    forkJoin({
      tables: this.tableService.getAll(),
      datasets: this.datasetService.getAll()
    }).subscribe({
      next: ({ tables, datasets }) => this.buildStats(tables, datasets),
      error: () => {
        this.error.set('Error cargando tablas');
        this.loading.set(false);
      }
    });
  }

  private buildStats(tables: Table[], datasets: Dataset[]): void {
    if (tables.length === 0) {
      this.tablesStats.set([]);
      this.loading.set(false);
      return;
    }

    const datasetMap = new Map<number, string>(
      datasets.map(d => [d.id, d.name])
    );

    const requests = tables.map(table =>
      forkJoin({
        fields: this.fieldService.getByTable(table.id),
        records: this.recordService.getAll(table.id)
      })
    );

    forkJoin(requests).subscribe({
      next: results => {
        const stats: TableStats[] = results.map((res, i) => {
          const fields = res.fields as Field[];
          return {
            table: tables[i],
            datasetName: datasetMap.get(tables[i].dataset_id) ?? '—',
            fieldsCount: fields.length,
            recordsCount: res.records.length,
            fieldTypes: Array.from(new Set(fields.map(f => f.type)))
          };
        });
        this.tablesStats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error cargando detalles de tablas');
        this.loading.set(false);
      }
    });
  }

  // =========================
  // FILTERED VIEW
  // =========================
  filteredTables = computed(() => {
    let data = [...this.tablesStats()];

    if (this.search()) {
      const q = this.search().toLowerCase();
      data = data.filter(d =>
        d.table.name.toLowerCase().includes(q) ||
        d.datasetName.toLowerCase().includes(q)
      );
    }

    if (this.fieldTypeFilter()) {
      data = data.filter(d => d.fieldTypes.includes(this.fieldTypeFilter()!));
    }

    switch (this.sortBy()) {
      case 'records': data.sort((a, b) => b.recordsCount - a.recordsCount); break;
      case 'fields': data.sort((a, b) => b.fieldsCount - a.fieldsCount); break;
      default: data.sort((a, b) => a.table.name.localeCompare(b.table.name));
    }

    return data;
  });

  // =========================
  // ACTIONS
  // =========================
  clearFilters(): void {
    this.search.set('');
    this.sortBy.set('name');
    this.fieldTypeFilter.set(null);
  }

  goToRecords(table: Table): void {
    this.router.navigate(['datasets', 'tables', table.id, 'records']);
  }
}
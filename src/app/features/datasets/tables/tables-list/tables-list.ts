import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { TableService } from '../../../../core/services/table.service';
import { FieldService } from '../../../../core/services/field.service';
import { RecordService } from '../../../../core/services/record.service';
import { DatasetService } from '../../../../core/services/datasets.service';

import { Table } from '../../../../core/models/table.model';
import { Dataset } from '../../../../core/models/dataset.model';
import { Field } from '../../../../core/models/field.model';

interface TableStats {
  table: Table;
  datasetName: string;   // ← nuevo
  fieldsCount: number;
  recordsCount: number;
  fieldTypes: string[];
}

type SortOption = 'name' | 'records' | 'fields';

@Component({
  selector: 'app-tables-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tables-list.html'
})
export class TablesListComponent implements OnInit {

  tablesStats = signal<TableStats[]>([]);
  loading = signal(true);
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
    this.loadTables();
  }

  // =========================
  // LOAD
  // =========================
  private loadTables(): void {
    this.loading.set(true);

    // Cargamos tablas y datasets en paralelo
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
    // Mapa id → nombre para lookup O(1)
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
        d.datasetName.toLowerCase().includes(q)  // ← busca también por dataset
      );
    }

    if (this.fieldTypeFilter()) {
      data = data.filter(d =>
        d.fieldTypes.includes(this.fieldTypeFilter()!)
      );
    }

    switch (this.sortBy()) {
      case 'records':
        data.sort((a, b) => b.recordsCount - a.recordsCount);
        break;
      case 'fields':
        data.sort((a, b) => b.fieldsCount - a.fieldsCount);
        break;
      default:
        data.sort((a, b) => a.table.name.localeCompare(b.table.name));
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
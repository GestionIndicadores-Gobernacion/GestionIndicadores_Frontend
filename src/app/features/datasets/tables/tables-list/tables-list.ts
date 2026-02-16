import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { TableService } from '../../../../core/services/table.service';
import { FieldService } from '../../../../core/services/field.service';
import { RecordService } from '../../../../core/services/record.service';

import { Table } from '../../../../core/models/table.model';
import { Field } from '../../../../core/models/field.model';

interface TableStats {
  table: Table;
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

  // =========================
  // DATA
  // =========================
  tablesStats = signal<TableStats[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // =========================
  // FILTER STATE
  // =========================
  search = signal('');
  sortBy = signal<SortOption>('name');
  fieldTypeFilter = signal<string | null>(null);

  constructor(
    private tableService: TableService,
    private fieldService: FieldService,
    private recordService: RecordService,
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

    this.tableService.getAll().subscribe({
      next: tables => this.buildStats(tables),
      error: () => {
        this.error.set('Error cargando tablas');
        this.loading.set(false);
      }
    });
  }

  private buildStats(tables: Table[]): void {
    const requests = tables.map(table =>
      forkJoin({
        fields: this.fieldService.getByTable(table.id),
        records: this.recordService.getAll(table.id)
      })
    );

    forkJoin(requests).subscribe({
      next: results => {
        const stats = results.map((res, i) => {
          const fields = res.fields as Field[];
          return {
            table: tables[i],
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

    // 🔍 SEARCH
    if (this.search()) {
      const q = this.search().toLowerCase();
      data = data.filter(d =>
        d.table.name.toLowerCase().includes(q)
      );
    }

    // 🧩 FIELD TYPE
    if (this.fieldTypeFilter()) {
      data = data.filter(d =>
        d.fieldTypes.includes(this.fieldTypeFilter()!)
      );
    }

    // 📊 SORT
    switch (this.sortBy()) {
      case 'records':
        data.sort((a, b) => b.recordsCount - a.recordsCount);
        break;
      case 'fields':
        data.sort((a, b) => b.fieldsCount - a.fieldsCount);
        break;
      default:
        data.sort((a, b) =>
          a.table.name.localeCompare(b.table.name)
        );
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
    this.router.navigate([
      'datasets',
      'tables',
      table.id,
      'records'
    ]);
  }
}

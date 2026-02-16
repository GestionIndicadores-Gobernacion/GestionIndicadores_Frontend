import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { RecordService } from '../../../../core/services/record.service';
import { FieldService } from '../../../../core/services/field.service';

import { TableRecord } from '../../../../core/models/record.model';
import { Field } from '../../../../core/models/field.model';

import { Pagination } from '../../../../shared/components/pagination/pagination';

type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-records-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './records-list.html',
  styleUrls: ['./records-list.css']
})
export class RecordsListComponent implements OnInit {

  tableId!: number;

  fields = signal<Field[]>([]);
  records = signal<TableRecord[]>([]);
  allRecords = signal<TableRecord[]>([]);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  pageSize = 10;
  currentPage = signal(1);
  totalPages = signal(1);

  searchTerm = signal('');
  columnFilters = signal<Record<string, string>>({});

  sortField = signal<string | null>(null);
  sortDirection = signal<SortDirection>('asc');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordService: RecordService,
    private fieldService: FieldService
  ) {}

  ngOnInit(): void {
    const tableId = this.route.snapshot.paramMap.get('tableId');

    if (!tableId) {
      this.error.set('Tabla no encontrada');
      this.loading.set(false);
      return;
    }

    this.tableId = Number(tableId);
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      fields: this.fieldService.getByTable(this.tableId),
      records: this.recordService.getAll(this.tableId)
    }).subscribe({
      next: ({ fields, records }) => {
        this.fields.set(fields);
        this.allRecords.set(records);

        const filters: Record<string, string> = {};
        fields.forEach(f => filters[f.name] = '');
        this.columnFilters.set(filters);

        this.currentPage.set(1);
        this.recompute();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error cargando registros');
        this.loading.set(false);
      }
    });
  }

  recompute(): void {
    let data = [...this.allRecords()];

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      data = data.filter(r =>
        Object.values(r.data ?? {}).some(v =>
          String(v ?? '').toLowerCase().includes(term)
        )
      );
    }

    const filters = this.columnFilters();
    data = data.filter(r =>
      Object.entries(filters).every(([k, v]) =>
        !v || String(r.data?.[k] ?? '').toLowerCase().includes(v.toLowerCase())
      )
    );

    if (this.sortField()) {
      const f = this.sortField()!;
      const d = this.sortDirection();

      data.sort((a, b) => {
        const va = a.data?.[f];
        const vb = b.data?.[f];
        if (va == null) return 1;
        if (vb == null) return -1;
        return va < vb ? (d === 'asc' ? -1 : 1) : (d === 'asc' ? 1 : -1);
      });
    }

    this.totalPages.set(Math.max(1, Math.ceil(data.length / this.pageSize)));

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }

    const start = (this.currentPage() - 1) * this.pageSize;
    this.records.set(data.slice(start, start + this.pageSize));
  }

  onSearchChange(): void {
    this.currentPage.set(1);
    this.recompute();
  }

  onColumnFilterChange(field: string, value: string): void {
    this.columnFilters.update(f => ({ ...f, [field]: value }));
    this.currentPage.set(1);
    this.recompute();
  }

  toggleSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.recompute();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.recompute();
  }

  updateRecord(record: TableRecord): void {
    this.recordService.update(record.id, record.data).subscribe();
  }

  deleteRecord(record: TableRecord): void {
    if (!confirm('¿Eliminar este registro?')) return;

    this.recordService.delete(record.id).subscribe(() => {
      this.allRecords.update(list => list.filter(r => r.id !== record.id));
      this.recompute();
    });
  }

  goBack(): void {
    this.router.navigate(['/datasets/tables'], { relativeTo: this.route });
  }

  trackByField = (_: number, f: Field) => f.id;
  trackByRecord = (_: number, r: TableRecord) => r.id;
}

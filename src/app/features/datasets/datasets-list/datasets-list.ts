import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Dataset } from '../../../features/datasets/models/dataset.model';
import { Table } from '../../../features/datasets/models/table.model';
import { DatasetService } from '../../../features/datasets/services/datasets.service';
import { TableService } from '../../../features/datasets/services/table.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { ImportDatasetModalComponent } from './import-dataset-modal/import-dataset-modal';
import { UpdateDatasetModalComponent } from './update-dataset-modal/update-dataset-modal';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-datasets-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ImportDatasetModalComponent,
    UpdateDatasetModalComponent,
    Pagination,
    LucideAngularModule,
    // TablesListComponent eliminado
  ],
  templateUrl: './datasets-list.html',
  styleUrls: ['./datasets-list.css']
})
export class DatasetsListComponent implements OnInit {

  datasets: Dataset[] = [];
  filteredDatasets: Dataset[] = [];
  paginatedDatasets: Dataset[] = [];

  // Mapa dataset_id → primera tabla
  tableMap = new Map<number, Table>();

  loading = false;
  error: string | null = null;
  showImportModal = false;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  sortColumn: keyof Dataset | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  refreshTrigger = 0;
  selectedDatasetToUpdate: Dataset | null = null;
  showUpdateModal = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private datasetService: DatasetService,
    private tableService: TableService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.loading = true;
    this.error = null;

    this.datasetService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.datasets = data;
          this.applyFilters();
          this.loading = false;
          this.loadTables();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'No se pudieron cargar los datasets';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadTables(): void {
    this.tableService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tables) => {
          this.tableMap.clear();
          // Guardar solo la primera tabla por dataset
          for (const t of tables) {
            if (!this.tableMap.has(t.dataset_id)) {
              this.tableMap.set(t.dataset_id, t);
            }
          }
          this.cdr.detectChanges();
        }
      });
  }

  goToDashboard(dataset: Dataset): void {
    const table = this.tableMap.get(dataset.id);
    if (table) {
      this.router.navigate(['/datasets/tables', table.id, 'records']);
    }
  }

  hasTable(dataset: Dataset): boolean {
    return this.tableMap.has(dataset.id);
  }

  // ── Sin cambios ────────────────────────────────────────────────────────────
  onSearch(): void { this.currentPage = 1; this.applyFilters(); }

  sort(column: keyof Dataset): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  applySorting(): void {
    if (!this.sortColumn) return;
    this.filteredDatasets.sort((a: any, b: any) => {
      let va = a[this.sortColumn] ?? '', vb = b[this.sortColumn] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va > vb) return this.sortDirection === 'asc' ? 1 : -1;
      if (va < vb) return this.sortDirection === 'asc' ? -1 : 1;
      return 0;
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredDatasets = this.datasets.filter(d =>
      d.name.toLowerCase().includes(term) ||
      (d.description || '').toLowerCase().includes(term)
    );
    this.applySorting();
    this.totalPages = Math.max(Math.ceil(this.filteredDatasets.length / this.pageSize), 1);
    this.applyPagination();
    this.cdr.detectChanges();
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedDatasets = this.filteredDatasets.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  openImportModal(): void { this.showImportModal = true; this.cdr.detectChanges(); }

  onImportFinished(): void {
    this.showImportModal = false;
    this.loadDatasets();
    this.refreshTrigger++;
    this.cdr.detectChanges();
  }

  onImportClosed(): void { this.showImportModal = false; this.cdr.detectChanges(); }

  remove(dataset: Dataset): void {
    Swal.fire({
      title: 'Eliminar dataset',
      text: `¿Eliminar el dataset "${dataset.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.datasetService.deactivate(dataset.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El dataset fue eliminado correctamente', 'success');
            this.loadDatasets();
            this.refreshTrigger++;
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar el dataset', 'error')
        });
    });
  }

  openUpdateModal(dataset: Dataset): void {
    this.selectedDatasetToUpdate = dataset;
    this.showUpdateModal = true;
    this.cdr.detectChanges();
  }

  onUpdateFinished(): void {
    this.showUpdateModal = false;
    this.selectedDatasetToUpdate = null;
    this.loadDatasets();
    this.refreshTrigger++;
    this.cdr.detectChanges();
  }

  onUpdateClosed(): void {
    this.showUpdateModal = false;
    this.selectedDatasetToUpdate = null;
    this.cdr.detectChanges();
  }
}
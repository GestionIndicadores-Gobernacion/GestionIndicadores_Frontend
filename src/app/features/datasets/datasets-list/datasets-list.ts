import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Dataset } from '../../../core/models/dataset.model';
import { DatasetService } from '../../../core/services/datasets.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { TablesListComponent } from '../tables/tables-list/tables-list';
import { ImportDatasetModalComponent } from './import-dataset-modal/import-dataset-modal';
import { UpdateDatasetModalComponent } from './update-dataset-modal/update-dataset-modal';

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
    TablesListComponent
  ],
  templateUrl: './datasets-list.html',
  styleUrls: ['./datasets-list.css']
})
export class DatasetsListComponent implements OnInit {

  datasets: Dataset[] = [];
  filteredDatasets: Dataset[] = [];
  paginatedDatasets: Dataset[] = [];

  loading = false;
  error: string | null = null;

  showImportModal = false;

  searchTerm = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  /** SORT */
  sortColumn: keyof Dataset | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  /** Incrementar este valor hace que TablesListComponent recargue sus datos. */
  refreshTrigger = 0;

  selectedDatasetToUpdate: Dataset | null = null;
  showUpdateModal = false;

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadDatasets();
  }

  // =========================
  // LOAD
  // =========================
  loadDatasets(): void {
    this.loading = true;
    this.error = null;

    this.datasetService.getAll().subscribe({
      next: (data) => {
        this.datasets = data;
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los datasets';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // SEARCH
  // =========================
  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  // =========================
  // SORT
  // =========================
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

      let valueA = a[this.sortColumn];
      let valueB = b[this.sortColumn];

      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();

      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;

      return 0;
    });

  }

  // =========================
  // FILTER + PAGINATION
  // =========================
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

  // =========================
  // IMPORT MODAL
  // =========================
  openImportModal(): void {
    this.showImportModal = true;
    this.cdr.detectChanges();
  }

  onImportFinished(): void {
    this.showImportModal = false;

    this.loadDatasets();

    this.refreshTrigger++;

    this.cdr.detectChanges();
  }

  onImportClosed(): void {
    this.showImportModal = false;
    this.cdr.detectChanges();
  }

  // =========================
  // DELETE
  // =========================
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

      this.datasetService.deactivate(dataset.id).subscribe({

        next: () => {

          Swal.fire(
            'Eliminado',
            'El dataset fue eliminado correctamente',
            'success'
          );

          this.loadDatasets();

          this.refreshTrigger++;

        },

        error: () => Swal.fire(
          'Error',
          'No se pudo eliminar el dataset',
          'error'
        )

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
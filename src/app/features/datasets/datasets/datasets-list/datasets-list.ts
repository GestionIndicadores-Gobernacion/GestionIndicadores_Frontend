import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { Dataset } from '../../../../core/models/dataset.model';
import { DatasetService } from '../../../../core/services/datasets.service';
import { ImportDatasetModalComponent } from '../import-dataset-modal/import-dataset-modal';
import { Pagination } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-datasets-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ImportDatasetModalComponent,
    Pagination
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

  // 🔍 búsqueda
  searchTerm = '';

  // 📄 paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(private datasetService: DatasetService) { }

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
      },
      error: () => {
        this.error = 'No se pudieron cargar los datasets';
        this.loading = false;
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
  // FILTER + PAGINATION
  // =========================
  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredDatasets = this.datasets.filter(d =>
      d.name.toLowerCase().includes(term) ||
      (d.description || '').toLowerCase().includes(term)
    );

    this.totalPages = Math.max(
      Math.ceil(this.filteredDatasets.length / this.pageSize),
      1
    );

    this.applyPagination();
  }

  applyPagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.paginatedDatasets = this.filteredDatasets.slice(start, end);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  // =========================
  // IMPORT MODAL
  // =========================
  openImportModal(): void {
    this.showImportModal = true;
  }

  onImportFinished(): void {
    this.showImportModal = false;
    this.loadDatasets();
  }

  onImportClosed(): void {
    this.showImportModal = false;
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
        },
        error: () => {
          Swal.fire(
            'Error',
            'No se pudo eliminar el dataset',
            'error'
          );
        }
      });
    });
  }
}

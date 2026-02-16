import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { DatasetService } from '../../../../core/services/datasets.service';

interface PreviewField {
  column: string;
  field_name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  selected: boolean;
}

interface PreviewSheet {
  sheet_name: string;
  rows_total: number;
  rows_with_data: number;
  fields: PreviewField[];
}

@Component({
  selector: 'app-import-dataset-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-dataset-modal.html',
  styleUrls: ['./import-dataset-modal.css']
})
export class ImportDatasetModalComponent {

  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  step = 1;
  file!: File;

  preview: PreviewSheet[] = [];
  progress = 0;
  importing = false;

  constructor(private datasetService: DatasetService) { }

  // =========================
  // STEP 1
  // =========================
  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.file = file;

    this.datasetService.previewImport(file).subscribe({
      next: res => {
        this.preview = res.preview.map(sheet => ({
          ...sheet,
          fields: sheet.fields.map(f => ({
            ...f,
            selected: true
          }))
        }));
        this.step = 2;
      },
      error: err => {
        Swal.fire(
          'Error',
          err?.error?.message || 'No se pudo leer el archivo',
          'error'
        );
      }
    });
  }

  // =========================
  // NAVIGATION
  // =========================
  next(): void {
    if (this.step < 4) this.step++;
  }

  prev(): void {
    if (this.step > 1) this.step--;
  }

  // =========================
  // IMPORT
  // =========================
  import(): void {
    this.importing = true;
    this.step = 4;
    this.progress = 0;

    // Progreso simulado (UX)
    const interval = setInterval(() => {
      this.progress += 8;
      if (this.progress >= 90) clearInterval(interval);
    }, 300);

    this.datasetService.importFromExcel(this.file).subscribe({
      next: () => {
        clearInterval(interval);
        this.progress = 100;

        Swal.fire(
          'Importado',
          'El dataset fue importado correctamente',
          'success'
        );

        this.imported.emit();
        this.close.emit();
      },
      error: err => {
        clearInterval(interval);
        Swal.fire(
          'Error',
          err?.error?.message || 'Error importando el archivo',
          'error'
        );
        this.importing = false;
      }
    });
  }

  // =========================
  // CLOSE
  // =========================
  closeModal(): void {
    if (this.importing) return;
    this.close.emit();
  }
}

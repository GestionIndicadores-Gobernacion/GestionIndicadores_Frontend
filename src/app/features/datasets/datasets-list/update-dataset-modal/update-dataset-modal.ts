import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import Swal from 'sweetalert2';
import { Dataset } from '../../../../core/models/dataset.model';
import { DatasetService } from '../../../../core/services/datasets.service';

@Component({
  selector: 'app-update-dataset-modal',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './update-dataset-modal.html',
  styleUrl: './update-dataset-modal.css',
})
export class UpdateDatasetModalComponent {

  @Input() dataset!: Dataset;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  selectedFile: File | null = null;
  uploading = false;

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      this.cdr.detectChanges();
    }
  }

  upload(): void {
    if (!this.selectedFile || !this.dataset) return;
    this.uploading = true;
    this.cdr.detectChanges();

    this.datasetService.updateFromExcel(this.dataset.id, this.selectedFile).subscribe({
      next: (result: any) => {
        this.uploading = false;
        Swal.fire(
          'Actualizado',
          `Dataset actualizado: ${result.records_inserted} registros importados`,
          'success'
        );
        this.updated.emit();
      },
      error: (err: any) => {
        this.uploading = false;
        this.cdr.detectChanges();
        Swal.fire('Error', err?.error?.message || 'Error actualizando el dataset', 'error');
      }
    });
  }

  closeModal(): void {
    if (this.uploading) return;
    this.close.emit();
  }
}

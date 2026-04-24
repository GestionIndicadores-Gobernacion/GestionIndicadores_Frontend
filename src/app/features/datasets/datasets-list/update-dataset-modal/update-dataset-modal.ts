import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import Swal from 'sweetalert2';
import { Dataset } from '../../../../features/datasets/models/dataset.model';
import { DatasetService } from '../../../../features/datasets/services/datasets.service';

@Component({
  selector: 'app-update-dataset-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './update-dataset-modal.html',
  styleUrl: './update-dataset-modal.css',
})
export class UpdateDatasetModalComponent implements OnInit {

  @Input() dataset!: Dataset;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  selectedFile: File | null = null;
  uploading = false;
  datasetName = '';

  private destroyRef = inject(DestroyRef);

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.datasetName = this.dataset?.name ?? '';
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      this.cdr.detectChanges();
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.cdr.detectChanges();
  }

  get nameChanged(): boolean {
    return this.datasetName.trim() !== (this.dataset?.name ?? '').trim();
  }

  get canSubmit(): boolean {
    if (this.uploading) return false;
    if (!this.datasetName.trim()) return false;
    return this.nameChanged || this.selectedFile !== null;
  }

  upload(): void {
    if (!this.canSubmit || !this.dataset) return;

    const trimmedName = this.datasetName.trim();
    if (!trimmedName) {
      Swal.fire('Nombre requerido', 'El nombre del dataset no puede estar vacío', 'warning');
      return;
    }

    this.uploading = true;
    this.cdr.detectChanges();

    const namePayload = this.nameChanged ? trimmedName : undefined;

    this.datasetService.updateFromExcel(
      this.dataset.id,
      this.selectedFile,
      namePayload,
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result: any) => {
        this.uploading = false;
        const parts: string[] = [];
        if (result?.file_processed) {
          parts.push(`${result.records_inserted} registros importados`);
        }
        if (result?.name_changed) {
          parts.push('nombre actualizado');
        }
        Swal.fire(
          'Actualizado',
          parts.length ? `Dataset actualizado: ${parts.join(', ')}` : 'Dataset actualizado',
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

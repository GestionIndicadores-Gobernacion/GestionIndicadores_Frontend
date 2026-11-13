import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import Swal from 'sweetalert2';
import {
  Dataset,
  DatasetImportResult,
  DatasetTypeIncompatibleError,
} from '../../../../features/datasets/models/dataset.model';
import { DatasetService } from '../../../../features/datasets/services/datasets.service';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    this.send(this.nameChanged ? trimmedName : undefined, false);
  }

  private send(namePayload: string | undefined, allowTypeChange: boolean): void {
    this.uploading = true;
    this.cdr.detectChanges();

    this.datasetService.updateFromExcel(
      this.dataset.id,
      this.selectedFile,
      namePayload,
      allowTypeChange,
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result: DatasetImportResult) => {
        this.uploading = false;
        this.cdr.detectChanges();
        const parts: string[] = [];
        if (result?.file_processed) {
          parts.push(`${result.records_inserted} registros importados`);
          if (result.skipped_rows) parts.push(`${result.skipped_rows} filas omitidas (vacías, incompletas o resúmenes)`);
          if (result.failed_rows) parts.push(`${result.failed_rows} registros fallidos`);
        }
        if (result?.name_changed) {
          parts.push('nombre actualizado');
        }
        const summary = parts.length ? `Dataset actualizado: ${parts.join(', ')}.` : 'Dataset actualizado.';
        const lines = [summary];
        if (result?.file_processed && result.dataset_type_label) {
          lines.push(`Dashboard: ${result.dataset_type_label}.`);
        }
        const warnings = result?.warnings ?? [];
        Swal.fire({
          title: 'Actualizado',
          html: [...lines, ...warnings].map(l => `<p style="margin:4px 0">${escapeHtml(l)}</p>`).join(''),
          icon: result?.failed_rows || warnings.length ? 'warning' : 'success',
        });
        this.updated.emit();
      },
      error: (err: any) => {
        this.uploading = false;
        this.cdr.detectChanges();
        const body = err?.error as DatasetTypeIncompatibleError | undefined;
        if (err?.status === 409 && body?.code === 'DATASET_TYPE_INCOMPATIBLE') {
          this.confirmTypeChange(body, namePayload);
          return;
        }
        Swal.fire('Error', err?.error?.message || err?.error?.error || 'Error actualizando el dataset', 'error');
      }
    });
  }

  /**
   * El archivo no tiene las columnas del dashboard actual del dataset. No se
   * modificó nada en el servidor; solo se reintenta si el usuario lo confirma.
   */
  private confirmTypeChange(body: DatasetTypeIncompatibleError, namePayload: string | undefined): void {
    const missing = (body.missing_columns ?? []).map(c => `<li>${escapeHtml(c)}</li>`).join('');
    Swal.fire({
      title: 'El archivo no coincide con el dashboard',
      icon: 'warning',
      html:
        `<p style="margin:4px 0">Este dataset usa el dashboard <b>${escapeHtml(body.expected_type_label)}</b>, ` +
        `pero el archivo no trae las columnas que necesita:</p>` +
        `<ul style="text-align:left;margin:8px 0 8px 20px;list-style:disc">${missing}</ul>` +
        `<p style="margin:4px 0">No se modificó el dataset. Revise que sea el archivo correcto. ` +
        `Si continúa, el dashboard pasará a <b>${escapeHtml(body.detected_type_label)}</b>.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Actualizar de todas formas',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
      focusCancel: true,
    }).then(res => {
      if (res.isConfirmed) this.send(namePayload, true);
    });
  }

  closeModal(): void {
    if (this.uploading) return;
    this.close.emit();
  }
}

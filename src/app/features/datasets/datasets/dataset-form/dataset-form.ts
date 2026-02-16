import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DatasetService } from '../../../../core/services/datasets.service';
import { Dataset } from '../../../../core/models/dataset.model';

@Component({
  selector: 'app-dataset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './dataset-form.html'
})
export class DatasetFormComponent implements OnInit {

  loading = false;
  submitting = false;
  datasetId: number | null = null;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private datasetService: DatasetService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.datasetId = Number(id);
      this.loadDataset(this.datasetId);
    }
  }

  /* ============================
     FORM
  ============================ */
  private buildForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['']
    });
  }

  /* ============================
     LOAD (EDIT)
  ============================ */
  loadDataset(id: number): void {
    this.loading = true;

    this.datasetService.getById(id).subscribe({
      next: (dataset: Dataset) => {
        this.form.patchValue({
          name: dataset.name,
          description: dataset.description ?? ''
        });
        this.loading = false;
      },
      error: () => {
        alert('No se pudo cargar el dataset');
        this.router.navigate(['/datasets']);
      }
    });
  }

  /* ============================
     SUBMIT
  ============================ */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.value;

    const request$ = this.datasetId
      ? this.datasetService.update(this.datasetId, payload)
      : this.datasetService.create(payload);

    request$.subscribe({
      next: () => {
        this.router.navigate(['/datasets']);
      },
      error: (err) => {
        this.handleBackendErrors(err);
        this.submitting = false;
      }
    });
  }

  /* ============================
     BACKEND ERRORS (Marshmallow)
  ============================ */
  private handleBackendErrors(error: any): void {
    const backendErrors = error?.error;
    if (!backendErrors || typeof backendErrors !== 'object') return;

    Object.keys(backendErrors).forEach((field) => {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({
          backend: backendErrors[field][0]
        });
      }
    });
  }

  /* ============================
     HELPERS
  ============================ */
  cancel(): void {
    this.router.navigate(['/datasets']);
  }
}

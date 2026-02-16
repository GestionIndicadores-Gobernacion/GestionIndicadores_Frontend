import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';

import { Field } from '../../../../core/models/field.model';
import { TableRecord } from '../../../../core/models/record.model';
import { FieldService } from '../../../../core/services/field.service';
import { RecordService } from '../../../../core/services/record.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './records-form.html'
})
export class RecordsFormComponent implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fieldService = inject(FieldService);
  private recordService = inject(RecordService);

  tableId!: number;
  recordId?: number;

  fields: Field[] = [];
  form!: FormGroup;

  loading = true;
  submitting = false;

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    this.tableId = Number(
      this.route.snapshot.queryParamMap.get('table_id')
    );

    const recordIdParam = this.route.snapshot.paramMap.get('recordId');
    this.recordId = recordIdParam ? Number(recordIdParam) : undefined;

    this.loadData();
  }

  // =========================
  // LOAD DATA (CORRECT WAY)
  // =========================
  loadData(): void {
    if (!this.tableId) {
      Swal.fire('Error', 'No se especificó la tabla', 'error');
      return;
    }

    forkJoin({
      fields: this.fieldService.getByTable(this.tableId),
      record: this.recordId
        ? this.recordService.getById(this.recordId)
        : of(undefined)
    }).subscribe({
      next: ({ fields, record }) => {
        this.fields = fields;
        this.buildForm(record);
        this.loading = false;
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
        this.loading = false;
      }
    });
  }

  // =========================
  // BUILD FORM
  // =========================
  buildForm(record?: TableRecord): void {
    const group: { [key: string]: any } = {};

    this.fields.forEach(field => {
      group[field.name] = [
        record?.data?.[field.name] ?? '',
        field.required ? Validators.required : []
      ];
    });

    this.form = this.fb.group(group);
  }

  // =========================
  // SUBMIT
  // =========================
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      table_id: this.tableId,
      data: this.form.value
    };

    this.submitting = true;

    const req = this.recordId
      ? this.recordService.update(this.recordId, payload.data)
      : this.recordService.create(payload);

    req.subscribe({
      next: () => {
        Swal.fire(
          'Guardado',
          'Registro guardado correctamente',
          'success'
        );
        this.router.navigate(['../'], { relativeTo: this.route });
      },
      error: err => {
        this.submitting = false;
        Swal.fire(
          'Error',
          err.error?.message || 'No se pudo guardar',
          'error'
        );
      }
    });
  }

  // =========================
  // ACTIONS
  // =========================
  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  trackByName(_: number, field: Field): string {
    return field.name;
  }
}

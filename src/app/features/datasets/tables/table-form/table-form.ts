import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { TableService } from '../../../../core/services/table.service';
import { DatasetService } from '../../../../core/services/datasets.service';
import { FieldService } from '../../../../core/services/field.service';

import { Dataset } from '../../../../core/models/dataset.model';

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './table-form.html',
  styleUrls: ['./table-form.css']
})
export class TableFormComponent implements OnInit {

  private fb = inject(FormBuilder);
  private tableService = inject(TableService);
  private fieldService = inject(FieldService);
  private datasetService = inject(DatasetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  tableId?: number;

  datasets: Dataset[] = [];
  loading = false;
  submitting = false;

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    this.initForm();
    this.loadDatasets();

    // 👇 UX: siempre inicia con una columna
    this.addField();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tableId = Number(id);
      // (editar más adelante si quieres)
    }
  }

  // =========================
  // FORM
  // =========================
  initForm(): void {
    this.form = this.fb.group({
      dataset_id: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      fields: this.fb.array([])
    });
  }

  get fields(): FormArray {
    return this.form.get('fields') as FormArray;
  }

  addField(): void {
    this.fields.push(
      this.fb.group({
        name: ['',],
        label: ['', Validators.required],
        type: ['text', Validators.required],
        required: [false],
        options: this.fb.array([])
      })
    );
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }


  removeField(index: number): void {
    this.fields.removeAt(index);
  }

  // =========================
  // OPTIONS (SELECT)
  // =========================
  getOptions(fieldIndex: number): FormArray {
    return this.fields.at(fieldIndex).get('options') as FormArray;
  }

  addOption(fieldIndex: number): void {
    this.getOptions(fieldIndex).push(
      this.fb.control('', Validators.required)
    );
  }

  removeOption(fieldIndex: number, optionIndex: number): void {
    this.getOptions(fieldIndex).removeAt(optionIndex);
  }

  // =========================
  // LOAD
  // =========================
  loadDatasets(): void {
    this.datasetService.getAll().subscribe({
      next: data => {
        this.datasets = data.filter(d => d.active);
      }
    });
  }

  // =========================
  // SUBMIT (TABLA + CAMPOS)
  // =========================
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.logInvalidControls();
      return;
    }

    // Generar names
    this.fields.controls.forEach(field => {
      const nameCtrl = field.get('name');
      const labelCtrl = field.get('label');

      if (nameCtrl && labelCtrl && !nameCtrl.value && labelCtrl.value) {
        nameCtrl.setValue(this.slugify(labelCtrl.value));
      }
    });

    const { fields, ...tablePayload } = this.form.value;

    this.submitting = true;

    // 1️⃣ Crear tabla
    this.tableService.create(tablePayload).subscribe({
      next: (table) => {

        // 2️⃣ Crear campos
        const requests = fields.map((f: any) =>
          this.fieldService.create({
            table_id: table.id,
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            options: f.options
          })
        );

        forkJoin(requests).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Tabla creada',
              timer: 1200,
              showConfirmButton: false
            });
            this.router.navigate(['datasets/tables']);
          },
          error: () => {
            this.submitting = false;
            Swal.fire('Error', 'Error creando campos', 'error');
          }
        });
      },
      error: () => {
        this.submitting = false;
        Swal.fire('Error', 'No se pudo crear la tabla', 'error');
      }
    });
  }


  // =========================
  // HELPERS
  // =========================
  private toSnakeCase(label: string): string {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
  }

  cancel(): void {
    Swal.fire({
      title: 'Cancelar',
      text: '¿Deseas salir sin guardar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then(res => {
      if (res.isConfirmed) {
        this.router.navigate(['datasets/tables']);
      }
    });
  }

  private logInvalidControls(): void {
    const invalid: any[] = [];

    const findInvalid = (group: FormGroup | FormArray, path = '') => {
      Object.keys(group.controls).forEach(key => {
        const control = group.get(key);
        const controlPath = path ? `${path}.${key}` : key;

        if (control instanceof FormGroup || control instanceof FormArray) {
          findInvalid(control, controlPath);
        } else {
          if (control?.invalid) {
            invalid.push({
              control: controlPath,
              errors: control.errors,
              value: control.value
            });
          }
        }
      });
    };

    findInvalid(this.form);

    console.group('❌ FORM INVALID');
    console.table(invalid);
    console.log('📦 Form value:', this.form.value);
    console.groupEnd();
  }

}

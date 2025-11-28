import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { StrategiesService } from '../../../core/services/strategy.service';
import { StrategyModel } from '../../../core/models/strategy.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-strategy-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './strategy-form.html',
  styleUrl: './strategy-form.css',
})
export class StrategyFormComponent implements OnInit {

  form!: FormGroup;

  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      active: [true],
    });

    if (this.isEdit) {
      this.loadStrategy();
    }
  }

  // Mostrar error visual
  showError(field: string) {
    const control = this.form.get(field);
    return control && control.invalid && (control.dirty || control.touched);
  }

  loadStrategy() {
    this.loading = true;

    this.strategiesService.getById(this.id!).subscribe({
      next: (data: StrategyModel) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error("Error al cargar la estrategia.");
      },
    });
  }

  // ----------------------------------------------------------------------
  // 🔥 Método principal del formulario
  // ----------------------------------------------------------------------
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }

    // Confirmar SI ES EDICIÓN
    if (this.isEdit) {
      this.toast.confirm(
        "¿Guardar cambios?",
        "¿Deseas actualizar esta estrategia?"
      ).then(result => {
        if (result.isConfirmed) {
          this.saveRequest();
        }
      });

      return;
    }

    // Si es creación → guardar de una
    this.saveRequest();
  }

  // ----------------------------------------------------------------------
  // 🔥 Método que ejecuta la petición real (crear o actualizar)
  // ----------------------------------------------------------------------
  private saveRequest() {
    this.saving = true;
    const body = this.form.value;

    const req = this.isEdit
      ? this.strategiesService.update(this.id!, body)
      : this.strategiesService.create(body);

    req.subscribe({
      next: () => {
        this.saving = false;

        this.toast.success(
          this.isEdit
            ? "Estrategia actualizada con éxito"
            : "Estrategia creada correctamente"
        );

        this.router.navigate(['/dashboard/strategies']);
      },
      error: () => {
        this.saving = false;
        // El errorInterceptor ya muestra el toast
      },
    });
  }
}

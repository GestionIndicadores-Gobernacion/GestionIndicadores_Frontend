import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComponentsService } from '../../../core/services/components.service';
import { StrategyModel } from '../../../core/models/strategy.model';
import { CommonModule } from '@angular/common';
import { StrategiesService } from '../../../core/services/strategy.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-componente-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './componente-form.html',
  styleUrl: './componente-form.css',
})
export class ComponentesFormComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  strategies: StrategyModel[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    // Crear form con strategy_id
    this.form = this.fb.group({
      strategy_id: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      data_type: ['integer', Validators.required],
      active: [true],
    });

    this.loadStrategies();

    if (this.isEdit) {
      this.loadComponent();
    }
  }

  // Mostrar error visual
  showError(field: string) {
    const control = this.form.get(field);
    return control && control.invalid && (control.dirty || control.touched);
  }

  loadStrategies() {
    this.strategiesService.getAll().subscribe({
      next: (res) => {
        this.strategies = res;
      },
      error: () => this.toast.error('Error al cargar estrategias')
    });
  }

  loadComponent() {
    this.loading = true;

    this.componentsService.getById(this.id!).subscribe({
      next: (data) => {
        this.form.patchValue({
          strategy_id: data.strategy_id,
          name: data.name,
          description: data.description,
          data_type: data.data_type,
          active: data.active,
        });
        this.loading = false;
      },
      error: () => {
        this.toast.error('Error al cargar el componente');
        this.loading = false;
      }
    });
  }

  // ======================================================================
  // 🔥 SUBMIT CON CONFIRM (solo para edición)
  // ======================================================================
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }

    // Confirmación si es edición
    if (this.isEdit) {
      this.toast.confirm(
        "¿Guardar cambios?",
        "¿Deseas actualizar este componente?"
      ).then(result => {
        if (result.isConfirmed) {
          this.saveRequest();
        }
      });
      return;
    }

    // Crear sin confirmación
    this.saveRequest();
  }

  // ======================================================================
  // 🔥 Guardar/actualizar
  // ======================================================================
  private saveRequest() {
    this.saving = true;
    const body = this.form.value;

    const request = this.isEdit
      ? this.componentsService.update(this.id!, body)
      : this.componentsService.create(body);

    request.subscribe({
      next: () => {
        this.saving = false;

        this.toast.success(
          this.isEdit
            ? "Componente actualizado con éxito"
            : "Componente creado correctamente"
        );

        this.router.navigate(['/dashboard/components']);
      },
      error: () => {
        this.saving = false;
        // Manejo centralizado por interceptor
      }
    });
  }
}

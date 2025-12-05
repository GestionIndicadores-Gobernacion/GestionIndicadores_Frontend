import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActivityModel } from '../../../core/models/activity.model';
import { StrategyModel } from '../../../core/models/strategy.model';
import { ActivitiesService } from '../../../core/services/activities.service';
import { StrategiesService } from '../../../core/services/strategy.service';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-activities-form',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule
  ],
  standalone: true,
  templateUrl: './activities-form.html',
  styleUrl: './activities-form.css',
})
export class ActivitiesFormComponent {
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
    private activitiesService: ActivitiesService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    // FORM — ahora sin name
    this.form = this.fb.group({
      strategy_id: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(3)]],
      active: [true],
    });

    this.loadStrategies();

    if (this.isEdit) {
      this.loadActivity();
    }
  }

  showError(field: string) {
    const control = this.form.get(field);
    return control && control.invalid && (control.dirty || control.touched);
  }

  // Cargar estrategias
  loadStrategies() {
    this.strategiesService.getAll().subscribe({
      next: (res) => this.strategies = res,
      error: () => this.toast.error("Error cargando estrategias"),
    });
  }

  // Cargar actividad para editar
  loadActivity() {
    this.loading = true;

    this.activitiesService.getById(this.id!).subscribe({
      next: (data: ActivityModel) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error("Error al cargar la actividad.");
      },
    });
  }

  // Submit
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning("Por favor completa los campos obligatorios.");
      return;
    }

    if (this.isEdit) {
      this.toast.confirm(
        "¿Guardar cambios?",
        "¿Deseas actualizar esta actividad?"
      ).then(result => {
        if (result.isConfirmed) {
          this.saveRequest();
        }
      });

      return;
    }

    this.saveRequest();
  }

  private saveRequest() {
    this.saving = true;

    const body = this.form.value;

    const req = this.isEdit
      ? this.activitiesService.update(this.id!, body)
      : this.activitiesService.create(body);

    req.subscribe({
      next: () => {
        this.saving = false;

        this.toast.success(
          this.isEdit
            ? "Actividad actualizada con éxito"
            : "Actividad creada correctamente"
        );

        this.router.navigate(['/dashboard/activities']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}

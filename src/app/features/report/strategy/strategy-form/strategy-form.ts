import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormControl
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { StrategyModel } from '../../../../features/report/models/strategy.model';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StrategyMetricsComponent } from './strategy-metrics/strategy-metrics';
import { ComponentsService } from '../../../../features/report/services/components.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-strategy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, StrategyMetricsComponent, LucideAngularModule],
  templateUrl: './strategy-form.html',
  styleUrl: './strategy-form.css',
})
export class StrategyFormComponent implements OnInit {

  form!: FormGroup;

  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  components: any[] = []

  private _loadedStrategy?: StrategyModel;
  private destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private strategiesService: StrategiesService,
    private componentService: ComponentsService,
    private toast: ToastService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.form = this.fb.group({
      name: ['', Validators.required],
      objective: ['', Validators.required],
      product_goal_description: ['', Validators.required],
      annual_goals: this.fb.array([]),
      metrics: this.fb.array([])
    });

    this.addYear();

    this.loadComponents(); // ← esta línea faltaba

    if (this.isEdit) {
      this.loadStrategy();
    }
  }

  getCalendarYear(index: number): string {
    return String(2024 + index);
  }

  // =========================
  // FORM ARRAY
  // =========================
  get years(): FormArray<FormGroup> {
    return this.form.get('annual_goals') as FormArray<FormGroup>;
  }

  get metrics(): FormArray {
    return this.form.get('metrics') as FormArray;
  }

  addYear(): void {

    const group = this.fb.group({
      value: new FormControl<number | null>(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)]
      })
    });

    this.years.push(group);
    this.cd.detectChanges();
  }

  removeYear(index: number) {
    this.years.removeAt(index);
    this.cd.detectChanges();
  }

  // =========================
  // TOTAL DINÁMICO
  // =========================
  get total(): number {
    return this.years.controls.reduce(
      (sum, g) => sum + Number(g.get('value')?.value || 0),
      0
    );
  }

  // =========================
  // LOAD EDIT
  // =========================
  loadStrategy() {

    this.loading = true;
    this.cd.detectChanges(); // mostrar spinner

    this.strategiesService.getById(this.id!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data: StrategyModel) => {

        this._loadedStrategy = data;

        console.log("METRICS BACKEND", data.metrics);

        this.form.patchValue({
          name: data.name,
          objective: data.objective,
          product_goal_description: data.product_goal_description
        });

        this.years.clear();

        data.annual_goals?.forEach(goal => {
          this.years.push(
            this.fb.group({
              value: goal.value
            })
          );
        });

        this.metrics.clear();

        data.metrics?.forEach(metric => {
          this.metrics.push(
            this.fb.group({
              description: metric.description,
              metric_type: metric.metric_type,
              component_id: metric.component_id,
              field_name: metric.field_name,
              dataset_id: metric.dataset_id,
              manual_value: metric.manual_value ?? null,
              year: metric.year ?? null,
            })
          );
        });

        this.loading = false;
        this.cd.detectChanges(); // refrescar vista
      },
      error: () => {
        this.toast.error('Error al cargar la estrategia');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  loadComponents() {
    const req$ = this.isEdit
      ? this.componentService.getByStrategy(this.id!)
      : this.componentService.getAll();

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.components = data;
        this.cd.detectChanges();
      }
    });
  }

  // =========================
  // SAVE
  // =========================
  submit() {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.cd.detectChanges();

    const payload = {
      ...this.form.value,

      annual_goals: this.years.controls.map((g, i) => ({
        year_number: i + 1,
        value: g.get('value')?.value
      })),

      metrics: this.metrics.controls.map(m => ({
        description: m.get('description')?.value,
        metric_type: m.get('metric_type')?.value,
        component_id: m.get('component_id')?.value,
        field_name: m.get('field_name')?.value,
        dataset_id: m.get('dataset_id')?.value ?? null,
        manual_value: m.get('manual_value')?.value ?? null,
        year: m.get('year')?.value ?? null,   // ← nuevo
      }))
    };

    console.log("PAYLOAD", payload);

    const req = this.isEdit
      ? this.strategiesService.update(this.id!, payload)
      : this.strategiesService.create(payload);

    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Estrategia guardada correctamente');
        this.router.navigate(['/reports/strategies']);
      },
      error: err => {
        this.toast.error(err.error?.message || 'Error al guardar');
        this.saving = false;
        this.cd.detectChanges();
      }
    });
  }

  showError(field: string) {
    const c = this.form.get(field);
    return c && c.invalid && (c.dirty || c.touched);
  }
}
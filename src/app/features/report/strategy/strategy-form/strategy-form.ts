import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormControl
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { StrategyModel } from '../../../../core/models/strategy.model';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-strategy-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.form = this.fb.group({
      name: ['', Validators.required],
      objective: ['', Validators.required],
      product_goal_description: ['', Validators.required],
      annual_goals: this.fb.array([])
    });

    this.addYear(); // mínimo un año

    if (this.isEdit) this.loadStrategy();
  }

  // =========================
  // FORM ARRAY
  // =========================
  get years(): FormArray<FormGroup> {
    return this.form.get('annual_goals') as FormArray<FormGroup>;
  }

  addYear(): void {
    const group = this.fb.group({
      value: new FormControl<number | null>(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)]
      })
    });

    this.years.push(group);
  }


  removeYear(index: number) {
    this.years.removeAt(index);
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

    this.strategiesService.getById(this.id!).subscribe({
      next: (data: StrategyModel) => {

        this.form.patchValue({
          name: data.name,
          objective: data.objective,
          product_goal_description: data.product_goal_description
        });

        this.years.clear();

        data.annual_goals.forEach(goal => {
          this.years.push(
            this.fb.group({
              value: goal.value
            })
          );
        });

        this.loading = false;
      },
      error: () => {
        this.toast.error('Error al cargar la estrategia');
        this.loading = false;
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

    const payload = {
      ...this.form.value,
      annual_goals: this.years.controls.map((g, i) => ({
        year_number: i + 1,
        value: g.get('value')?.value
      }))
    };

    const req = this.isEdit
      ? this.strategiesService.update(this.id!, payload)
      : this.strategiesService.create(payload);

    req.subscribe({
      next: () => {
        this.toast.success('Estrategia guardada correctamente');
        this.router.navigate(['/reports/strategies']);
      }
    });
  }

  showError(field: string) {
    const c = this.form.get(field);
    return c && c.invalid && (c.dirty || c.touched);
  }
}

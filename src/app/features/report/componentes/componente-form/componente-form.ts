import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ComponentsService } from '../../../../core/services/components.service';
import { StrategiesService } from '../../../../core/services/strategies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StrategyModel } from '../../../../core/models/strategy.model';

@Component({
  selector: 'app-component-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './componente-form.html',
  styleUrl: './componente-form.css'
})
export class ComponenteFormComponent implements OnInit {

  form!: FormGroup;

  strategies: StrategyModel[] = [];

  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: ComponentsService,
    private strategiesService: StrategiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.form = this.fb.group({
      strategy_id: [null, Validators.required],
      name: ['', Validators.required],
      objectives: this.fb.array<FormGroup>([]),
      mga_activities: this.fb.array<FormGroup>([]),
      indicators: this.fb.array<FormGroup>([])

    });

    this.loadStrategies();

    if (this.isEdit) {
      this.loadComponent();
    } else {
      this.addObjective();
      this.addIndicator();
    }
  }

  // =====================
  // GETTERS
  // =====================

  get objectives(): FormArray {
    return this.form.get('objectives') as FormArray;
  }

  get activities(): FormArray {
    return this.form.get('mga_activities') as FormArray;
  }

  get indicators(): FormArray {
    return this.form.get('indicators') as FormArray;
  }

  // =====================
  // OBJECTIVES
  // =====================

  addObjective(data?: any) {
    this.objectives.push(
      this.fb.group({
        id: [data?.id || null],
        description: [data?.description || '', Validators.required]
      })
    );
  }

  removeObjective(i: number) {
    this.objectives.removeAt(i);
  }

  // =====================
  // ACTIVITIES
  // =====================

  addActivity(data?: any) {
    this.activities.push(
      this.fb.group({
        id: [data?.id || null],
        name: [data?.name || '', Validators.required]
      })
    );
  }

  removeActivity(i: number) {
    this.activities.removeAt(i);
  }

  // =====================
  // INDICATORS
  // =====================

  addIndicator(data?: any) {

    const group: FormGroup = this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', Validators.required],
      field_type: [data?.field_type || 'text', Validators.required],
      is_required: [data?.is_required ?? true],
      configOptions: [data?.config?.options?.join('\n') || ''],
      configFields: [data?.config?.fields?.join('\n') || '']
    }) as FormGroup;


    // SOLO NUMBER TIENE TARGETS
    if ((data?.field_type || 'text') === 'number') {

      const targetsArray = this.fb.array<FormGroup>([]);

      if (data?.targets?.length) {
        data.targets.forEach((t: any) => {
          targetsArray.push(
            this.fb.group({
              id: [t.id || null],
              year: [t.year, Validators.required],
              target_value: [t.target_value, [Validators.required, Validators.min(0.0001)]]
            })
          );
        });
      } else {
        targetsArray.push(
          this.fb.group({
            id: [null],
            year: [new Date().getFullYear(), Validators.required],
            target_value: [null, [Validators.required, Validators.min(0.0001)]]
          })
        );
      }

      group.addControl('targets', targetsArray);
    }

    this.indicators.push(group);
  }


  getTargets(indicatorIndex: number): FormArray<FormGroup> {
    return this.indicators.at(indicatorIndex).get('targets') as FormArray;
  }

  addTarget(indicatorIndex: number) {
    this.getTargets(indicatorIndex).push(
      this.fb.group({
        id: [null],
        year: [new Date().getFullYear(), Validators.required],
        target_value: [null, [Validators.required, Validators.min(0.0001)]]
      })
    );
  }

  removeTarget(indicatorIndex: number, targetIndex: number) {
    this.getTargets(indicatorIndex).removeAt(targetIndex);
  }


  removeIndicator(i: number) {
    this.indicators.removeAt(i);
  }

  // =====================
  // LOAD
  // =====================

  loadStrategies() {
    this.strategiesService.getAll().subscribe(s => this.strategies = s);
  }

  loadComponent() {

    this.loading = true;

    this.service.getById(this.id!).subscribe({
      next: data => {

        this.form.patchValue({
          strategy_id: data.strategy_id,
          name: data.name
        });

        data.objectives?.forEach(o => this.addObjective(o));
        data.mga_activities?.forEach(a => this.addActivity(a));
        data.indicators?.forEach(i => this.addIndicator(i));

        this.form.get('strategy_id')?.disable();

        this.loading = false;
      },
      error: () => {
        this.toast.error('Error cargando componente');
        this.loading = false;
      }
    });
  }

  // =====================
  // SUBMIT
  // =====================

  submit() {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    this.form.get('strategy_id')?.enable();

    const raw = this.form.value;

    const payload = {
      strategy_id: raw.strategy_id,
      name: raw.name,

      objectives: raw.objectives.map((o: any) => ({
        description: o.description
      })),

      mga_activities: raw.mga_activities.map((a: any) => ({
        name: a.name
      })),

      indicators: raw.indicators.map((i: any) => ({
        name: i.name,
        field_type: i.field_type,
        is_required: i.is_required,

        config:
          i.field_type === 'select'
            ? {
              options: i.configOptions
                .split('\n')
                .map((o: string) => o.trim())
                .filter((o: string) => o)
            }
            : i.field_type === 'sum_group'
              ? {
                fields: i.configFields
                  .split('\n')
                  .map((o: string) => o.trim())
                  .filter((o: string) => o)
              }
              : null,

        targets: i.field_type === 'number'
          ? (i.targets || []).map((t: any) => ({
            year: Number(t.year),
            target_value: Number(t.target_value)
          }))
          : []
      }))
    };



    const req = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req.subscribe({
      next: () => {
        this.toast.success('Componente guardado correctamente');
        this.router.navigate(['/reports/components']);
      },
      error: err => {
        this.toast.error(err.error?.message || 'Error al guardar');
        this.saving = false;
      }
    });
  }
}

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


    // NUMBER y SUM_GROUP TIENEN TARGETS
    const fieldType = data?.field_type || 'text';
    if (fieldType === 'number' || fieldType === 'sum_group') {

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

    // LISTENER: Cuando cambia el tipo de campo, agregar/quitar targets
    group.get('field_type')?.valueChanges.subscribe((newType: string) => {
      this.onFieldTypeChange(group, newType);
    });
  }

  // Manejar cambio de tipo de campo
  private onFieldTypeChange(indicatorGroup: FormGroup, newType: string) {
    const needsTargets = newType === 'number' || newType === 'sum_group';
    const hasTargets = indicatorGroup.contains('targets');

    if (needsTargets && !hasTargets) {
      // Agregar targets si el tipo lo requiere y no los tiene
      const targetsArray = this.fb.array<FormGroup>([
        this.fb.group({
          id: [null],
          year: [new Date().getFullYear(), Validators.required],
          target_value: [null, [Validators.required, Validators.min(0.0001)]]
        })
      ]);
      indicatorGroup.addControl('targets', targetsArray);
    } else if (!needsTargets && hasTargets) {
      // Remover targets si el tipo no los requiere
      indicatorGroup.removeControl('targets');
    }
  }


  getTargets(indicatorIndex: number): FormArray<FormGroup> {
    const targetsControl = this.indicators.at(indicatorIndex).get('targets');
    return targetsControl as FormArray<FormGroup> || this.fb.array<FormGroup>([]);
  }

  addTarget(indicatorIndex: number) {
    const targetsArray = this.getTargets(indicatorIndex);
    targetsArray.push(
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

  // =====================
  // SUBMIT CON DEBUG
  // =====================

  submit() {
    console.log('=== INICIO SUBMIT ===');

    if (this.form.invalid) {
      console.log('Formulario inválido');
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.form.get('strategy_id')?.enable();

    const raw = this.form.value;
    console.log('1. Form raw value:', raw);

    const payload = {
      strategy_id: raw.strategy_id,
      name: raw.name,

      objectives: raw.objectives.map((o: any) => ({
        description: o.description
      })),

      mga_activities: raw.mga_activities.map((a: any) => ({
        name: a.name
      })),

      indicators: raw.indicators.map((i: any, index: number) => {
        console.log(`\n--- Procesando indicador ${index}: ${i.name} ---`);
        console.log('Field type:', i.field_type);
        console.log('Raw targets:', i.targets);

        const indicator: any = {
          name: i.name,
          field_type: i.field_type,
          is_required: i.is_required,
          config: null,
          targets: []
        };

        // Config for SELECT
        if (i.field_type === 'select') {
          indicator.config = {
            options: i.configOptions
              .split('\n')
              .map((o: string) => o.trim())
              .filter((o: string) => o)
          };
          console.log('Config SELECT:', indicator.config);
        }

        // Config for SUM_GROUP
        else if (i.field_type === 'sum_group') {
          indicator.config = {
            fields: i.configFields
              .split('\n')
              .map((o: string) => o.trim())
              .filter((o: string) => o)
          };
          console.log('Config SUM_GROUP:', indicator.config);
        }

        // Targets for NUMBER and SUM_GROUP
        if (i.field_type === 'number' || i.field_type === 'sum_group') {
          console.log('Este indicador DEBE tener targets');
          console.log('¿Tiene array de targets?', Array.isArray(i.targets));
          console.log('Cantidad de targets:', i.targets?.length);

          if (i.targets && Array.isArray(i.targets)) {
            indicator.targets = i.targets.map((t: any) => {
              const target = {
                year: Number(t.year),
                target_value: Number(t.target_value)
              };
              console.log('Target procesado:', target);
              return target;
            });
          } else {
            console.warn('⚠️ NO HAY TARGETS en el form pero debería haberlos!');
          }
        }

        console.log('Indicador final:', indicator);
        return indicator;
      })
    };

    console.log('\n=== PAYLOAD FINAL ===');
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n=== INDICADORES CON TARGETS ===');
    payload.indicators.forEach((ind: any, i: number) => {
      if (ind.targets && ind.targets.length > 0) {
        console.log(`${i}. ${ind.name} (${ind.field_type}):`, ind.targets);
      }
    });

    const req = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req.subscribe({
      next: (response) => {
        console.log('\n=== RESPUESTA DEL SERVIDOR ===');
        console.log('Response completa:', response);
        console.log('Indicadores en respuesta:', response.indicators);

        this.toast.success('Componente guardado correctamente');
        this.router.navigate(['/reports/components']);
      },
      error: err => {
        console.error('\n=== ERROR DEL SERVIDOR ===');
        console.error('Error completo:', err);
        console.error('Error body:', err.error);

        this.toast.error(err.error?.message || 'Error al guardar');
        this.saving = false;
      }
    });
  }


}
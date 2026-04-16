import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder, FormGroup, FormArray,
  Validators, ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ComponentsService } from '../../../../features/report/services/components.service';
import { StrategiesService } from '../../../../features/report/services/strategies.service';
import { PublicPoliciesService } from '../../../../features/report/services/public-policies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StrategyModel } from '../../../../features/report/models/strategy.model';
import { PublicPolicyModel } from '../../../../features/report/models/component.model';
import { ComponenteIndicatorsFormComponent } from './componente-indicators-form/componente-indicators-form';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-component-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ComponenteIndicatorsFormComponent,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './componente-form.html',
  styleUrl: './componente-form.css'
})
export class ComponenteFormComponent implements OnInit {

  private _indicatorsComponent?: ComponenteIndicatorsFormComponent;
  private pendingIndicators: any[] = [];
  private indicatorsLoaded = false;

  @ViewChild(ComponenteIndicatorsFormComponent)
  set indicatorsComponent(component: ComponenteIndicatorsFormComponent) {
    this._indicatorsComponent = component;
    if (component && !this.indicatorsLoaded && this.pendingIndicators.length > 0) {
      this.indicatorsLoaded = true;
      const toLoad = [...this.pendingIndicators];
      this.pendingIndicators = [];
      setTimeout(() => {
        toLoad.forEach(ind => component.addIndicator(ind));
        this.cdr.detectChanges();
      });
    }
  }

  get indicatorsComponent(): ComponenteIndicatorsFormComponent | undefined {
    return this._indicatorsComponent;
  }

  form!: FormGroup;
  strategies: StrategyModel[] = [];

  // ── Políticas públicas ──────────────────────────────────────
  allPolicies: PublicPolicyModel[] = [];
  selectedPolicyIds: Set<number> = new Set();
  policySearch = '';

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
    private publicPoliciesService: PublicPoliciesService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
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
    this.loadPolicies();

    if (this.isEdit) {
      this.loadComponent();
    } else {
      this.addObjective();
      this.pendingIndicators.push({});
    }
  }

  // ── Getters ─────────────────────────────────────────────────

  get objectives(): FormArray {
    return this.form.get('objectives') as FormArray;
  }

  get activities(): FormArray {
    return this.form.get('mga_activities') as FormArray;
  }

  // ── Políticas públicas ──────────────────────────────────────

  loadPolicies(): void {
    this.publicPoliciesService.getAll().subscribe({
      next: policies => {
        this.allPolicies = policies ?? [];
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Error cargando políticas públicas')
    });
  }

  get filteredPolicies(): PublicPolicyModel[] {
    const term = this.policySearch.toLowerCase().trim();
    if (!term) return this.allPolicies;
    return this.allPolicies.filter(p =>
      p.code.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }

  togglePolicy(id: number): void {
    if (this.selectedPolicyIds.has(id)) {
      this.selectedPolicyIds.delete(id);
    } else {
      this.selectedPolicyIds.add(id);
    }
    this.cdr.detectChanges();
  }

  isPolicySelected(id: number): boolean {
    return this.selectedPolicyIds.has(id);
  }

  get selectedPoliciesCount(): number {
    return this.selectedPolicyIds.size;
  }

  // ── Objectives / Activities ──────────────────────────────────

  addObjective(data?: any): void {
    this.objectives.push(this.fb.group({
      id: [data?.id || null],
      description: [data?.description || '', Validators.required]
    }));
  }

  removeObjective(i: number): void { this.objectives.removeAt(i); }

  addActivity(data?: any): void {
    this.activities.push(this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', Validators.required]
    }));
  }

  removeActivity(i: number): void { this.activities.removeAt(i); }

  addIndicator(): void {
    if (this._indicatorsComponent) {
      this._indicatorsComponent.addIndicator();
      this.cdr.detectChanges();
    }
  }

  // ── Load data ───────────────────────────────────────────────

  loadStrategies(): void {
    this.strategiesService.getAll().subscribe({
      next: s => {
        this.strategies = s ?? [];
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Error cargando estrategias')
    });
  }

  loadComponent(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.service.getById(this.id!).subscribe({
      next: data => {
        this.form.patchValue({ strategy_id: data.strategy_id, name: data.name });

        data.objectives?.forEach(o => this.addObjective(o));
        data.mga_activities?.forEach(a => this.addActivity(a));

        if (data.indicators?.length) {
          this.pendingIndicators = data.indicators;
        }

        // ── Cargar políticas seleccionadas ──────────────────
        if (data.public_policies?.length) {
          this.selectedPolicyIds = new Set(data.public_policies.map(p => p.id));
        }

        this.form.get('strategy_id')?.disable();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error cargando componente');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Submit ───────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();
    this.form.get('strategy_id')?.enable();

    const raw = this.form.value;

    const payload = {
      strategy_id: raw.strategy_id,
      name: raw.name,
      objectives: raw.objectives.map((o: any) => ({ description: o.description })),
      mga_activities: raw.mga_activities.map((a: any) => ({ name: a.name })),
      indicators: this._indicatorsComponent?.serializeIndicators() || [],
      public_policy_ids: Array.from(this.selectedPolicyIds)   // ← NUEVO
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
        this.cdr.detectChanges();
      }
    });
  }
}
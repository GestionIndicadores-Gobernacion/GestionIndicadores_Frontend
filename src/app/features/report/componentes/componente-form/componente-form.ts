import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { ComponenteIndicatorsFormComponent } from './componente-indicators-form/componente-indicators-form';

@Component({
  selector: 'app-component-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ComponenteIndicatorsFormComponent],
  templateUrl: './componente-form.html',
  styleUrl: './componente-form.css'
})
export class ComponenteFormComponent implements OnInit {

  private _indicatorsComponent?: ComponenteIndicatorsFormComponent;
  private pendingIndicators: any[] = [];
  private indicatorsLoaded = false;

  @ViewChild(ComponenteIndicatorsFormComponent) 
  set indicatorsComponent(component: ComponenteIndicatorsFormComponent) {
    console.log('🔧 ViewChild setter called');
    console.log('   Component exists:', !!component);
    console.log('   Indicators loaded:', this.indicatorsLoaded);
    console.log('   Pending indicators:', this.pendingIndicators.length);
    console.log('   Loading state:', this.loading);
    
    this._indicatorsComponent = component;
    
    if (component && !this.indicatorsLoaded && this.pendingIndicators.length > 0) {
      console.log('✅ Loading', this.pendingIndicators.length, 'indicators...');
      this.indicatorsLoaded = true;
      const toLoad = [...this.pendingIndicators];
      this.pendingIndicators = [];
      
      setTimeout(() => {
        console.log('📥 Actually adding indicators to component');
        toLoad.forEach((ind, idx) => {
          console.log(`   ${idx + 1}. ${ind.name} (${ind.field_type})`);
          component.addIndicator(ind);
        });
        console.log('✓ Done loading indicators');
        this.cdr.detectChanges(); // 🔥 Forzar detección
      }, 0);
    }
  }
  
  get indicatorsComponent(): ComponenteIndicatorsFormComponent | undefined {
    return this._indicatorsComponent;
  }

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

    if (this.isEdit) {
      this.loadComponent();
    } else {
      this.addObjective();
      this.pendingIndicators.push({});
    }
  }

  get objectives(): FormArray {
    return this.form.get('objectives') as FormArray;
  }

  get activities(): FormArray {
    return this.form.get('mga_activities') as FormArray;
  }

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

  addIndicator() {
    console.log('🔘 addIndicator() called');
    console.log('   Component exists:', !!this._indicatorsComponent);
    
    if (this._indicatorsComponent) {
      this._indicatorsComponent.addIndicator();
    }
  }

  loadStrategies() {
    this.strategiesService.getAll().subscribe(s => this.strategies = s);
  }

  loadComponent() {
    this.loading = true;
    console.log('📡 Loading component from server...');

    this.service.getById(this.id!).subscribe({
      next: data => {
        console.log('📦 Received data from server:', data);
        console.log('   Indicators count:', data.indicators?.length || 0);
        
        this.form.patchValue({
          strategy_id: data.strategy_id,
          name: data.name
        });

        data.objectives?.forEach(o => this.addObjective(o));
        data.mga_activities?.forEach(a => this.addActivity(a));
        
        if (data.indicators && data.indicators.length > 0) {
          console.log('💾 Storing indicators in pendingIndicators:', data.indicators.length);
          this.pendingIndicators = data.indicators;
        }

        this.form.get('strategy_id')?.disable();
        this.loading = false;
        console.log('✓ loading = false');
      },
      error: () => {
        this.toast.error('Error cargando componente');
        this.loading = false;
      }
    });
  }

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

      indicators: this._indicatorsComponent?.serializeIndicators() || []
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
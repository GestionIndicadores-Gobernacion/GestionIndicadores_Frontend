import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActivityModel } from '../../../../core/models/activity.model';
import { StrategyModel } from '../../../../core/models/strategy.model';
import { ActivitiesService } from '../../../../core/services/activities.service';
import { ComponentsService } from '../../../../core/services/components.service';
import { StrategiesService } from '../../../../core/services/strategy.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-componente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
  activities: ActivityModel[] = [];
  filteredActivities: ActivityModel[] = [];

  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched)
    );
  }


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private componentsService: ComponentsService,
    private strategiesService: StrategiesService,
    private activitiesService: ActivitiesService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.form = this.fb.group({
      strategy_id: ['', Validators.required],
      activity_id: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      data_type: ['integer', Validators.required],
      active: [true],
    });

    this.loadBaseData();

    if (this.isEdit) {
      this.loadComponent();
    }
  }

  loadBaseData() {
    this.strategiesService.getAll().subscribe(s => this.strategies = s);
    this.activitiesService.getAll().subscribe(a => this.activities = a);
  }

  onStrategyChange(strategyId: number) {
    this.filteredActivities = this.activities.filter(
      a => a.strategy_id === Number(strategyId)
    );

    this.form.patchValue({ activity_id: '' });
  }

  loadComponent() {
    this.loading = true;

    this.componentsService.getById(this.id!).subscribe(comp => {
      const activity = this.activities.find(a => a.id === comp.activity_id);

      this.form.patchValue({
        strategy_id: activity?.strategy_id,
        activity_id: comp.activity_id,
        name: comp.name,
        description: comp.description,
        data_type: comp.data_type,
        active: comp.active,
      });

      if (activity) {
        this.filteredActivities = this.activities.filter(
          a => a.strategy_id === activity.strategy_id
        );
      }

      this.loading = false;
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Completa los campos obligatorios');
      return;
    }

    const { strategy_id, ...payload } = this.form.value;

    const req = this.isEdit
      ? this.componentsService.update(this.id!, payload)
      : this.componentsService.create(payload);

    req.subscribe({
      next: () => {
        this.toast.success(
          this.isEdit ? 'Componente actualizado' : 'Componente creado'
        );
        this.router.navigate(['/records/components']);
      },
      error: () => this.toast.error('Error al guardar'),
    });
  }

}

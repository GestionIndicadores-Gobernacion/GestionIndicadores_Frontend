import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { IndicatorModel } from '../../../core/models/indicator.model';
import { ComponentsService } from '../../../core/services/components.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-indicator-form',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './indicator-form.html',
  styleUrl: './indicator-form.css',
})
export class IndicatorFormComponent {
  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  components: ComponentModel[] = [];

  form: any = {
    component_id: null,
    name: '',
    description: '',
    data_type: 'integer',
    required: false,
    use_list: false,
    allowed_values_text: '',
    active: true,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private indicatorsService: IndicatorsService,
    private componentsService: ComponentsService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.loadComponents();

    if (this.isEdit) {
      this.loadIndicator();
    }
  }

  loadComponents() {
    this.componentsService.getAll().subscribe({
      next: (res) => (this.components = res),
      error: () => alert('Error cargando componentes'),
    });
  }

  loadIndicator() {
    this.loading = true;
    this.indicatorsService.getById(this.id!).subscribe({
      next: (data: IndicatorModel) => {
        this.form.component_id = data.component_id;
        this.form.name = data.name;
        this.form.description = data.description ?? '';
        this.form.data_type = data.data_type;
        this.form.required = data.required;
        this.form.use_list = data.use_list;
        this.form.active = data.active;
        this.form.allowed_values_text = (data.allowed_values || []).join(', ');
        this.loading = false;
      },
      error: () => {
        alert('Error cargando indicador');
        this.loading = false;
      },
    });
  }

  private buildBodyFromForm() {
    const allowed_values =
      this.form.use_list && this.form.allowed_values_text
        ? this.form.allowed_values_text
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0)
        : [];

    return {
      component_id: this.form.component_id,
      name: this.form.name,
      description: this.form.description || null,
      data_type: this.form.data_type,
      required: this.form.required,
      use_list: this.form.use_list,
      allowed_values,
      active: this.form.active,
    };
  }

  save() {
    if (!this.form.component_id || !this.form.name || !this.form.data_type) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    this.saving = true;
    const body = this.buildBodyFromForm();

    const req$ = this.isEdit
      ? this.indicatorsService.update(this.id!, { id: this.id!, ...body })
      : this.indicatorsService.create(body);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard/indicators']);
      },
      error: () => {
        this.saving = false;
        alert('Error al guardar el indicador');
      },
    });
  }
}

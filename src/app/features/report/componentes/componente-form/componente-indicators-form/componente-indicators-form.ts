import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewChildren, QueryList } from '@angular/core';
import {
  FormBuilder, FormGroup, FormArray,
  Validators, ReactiveFormsModule, AbstractControl
} from '@angular/forms';
import { ConfigCategorizedGroupComponent } from './componente-indicator-config/config-categorized-group/config-categorized-group';
import { ConfigDatasetComponent } from './componente-indicator-config/config-dataset/config-dataset';
import { ConfigFileAttachmentComponent } from './componente-indicator-config/config-file-attachment/config-file-attachment';
import { ConfigGroupedDataComponent } from './componente-indicator-config/config-grouped-data/config-grouped-data';
import { ConfigSelectComponent } from './componente-indicator-config/config-select/config-select';
import { ConfigSumGroupComponent } from './componente-indicator-config/config-sum-group/config-sum-group';
import { IndicatorTargetsComponent } from './componente-indicator-targets/indicator-targets/indicator-targets';


@Component({
  selector: 'app-componente-indicators-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ConfigSelectComponent, ConfigSumGroupComponent,
    ConfigGroupedDataComponent, ConfigCategorizedGroupComponent,
    ConfigFileAttachmentComponent, ConfigDatasetComponent,
    IndicatorTargetsComponent
  ],
  templateUrl: './componente-indicators-form.html'
})
export class ComponenteIndicatorsFormComponent implements OnInit {

  @Input() parentForm!: FormGroup;

  @ViewChildren(ConfigCategorizedGroupComponent)
  cgComponents!: QueryList<ConfigCategorizedGroupComponent>;

  @ViewChildren(ConfigGroupedDataComponent)
  gdComponents!: QueryList<ConfigGroupedDataComponent>;

  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;

  readonly TYPES_WITH_TARGETS = ['number', 'sum_group', 'grouped_data', 'categorized_group'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void { }

  // ── Getter ───────────────────────────────────────────────────────

  get indicators(): FormArray {
    return this.parentForm.get('indicators') as FormArray;
  }

  // ── Drag & Drop ──────────────────────────────────────────────────

  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.draggedIndex !== null && this.draggedIndex !== index) this.dragOverIndex = index;
  }

  onDragLeave(event: DragEvent) {
    const rel = event.relatedTarget as HTMLElement;
    const cur = event.currentTarget as HTMLElement;
    if (!cur.contains(rel)) this.dragOverIndex = null;
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === dropIndex) { this.resetDrag(); return; }
    const ctrl = this.indicators.at(this.draggedIndex);
    this.indicators.removeAt(this.draggedIndex);
    this.indicators.insert(dropIndex, ctrl);
    this.resetDrag();
  }

  onDragEnd() { this.resetDrag(); }
  private resetDrag() { this.draggedIndex = null; this.dragOverIndex = null; }

  // ── Indicator CRUD ───────────────────────────────────────────────

  addIndicator(data?: any) {
    const fieldType = data?.field_type || 'text';

    const group = this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', [Validators.required, Validators.minLength(3)]],
      field_type: [fieldType, Validators.required],
      is_required: [data?.is_required ?? true],
      // Config controls
      configOptions: [data?.config?.options?.join('\n') || ''],
      configFields: [data?.config?.fields?.join('\n') || ''],
      configParentField: [data?.config?.parent_field || null],
      configAutoTotal: [data?.config?.auto_total || false],
      configSubFields: [this.formatSubFields(data?.config?.sub_fields)],
      configAllowedTypes: [data?.config?.allowed_types?.join(', ') || ''],
      configMaxSizeMb: [data?.config?.max_size_mb || null],
      configDatasetId: [data?.config?.dataset_id || null],
      configTableId: [data?.config?.table_id || null],
      configLabelField: [data?.config?.label_field || ''],
      cgCategoryLabel: [data?.config?.category_label || ''],
      cgCategories: [data?.config?.categories?.join('\n') || ''],
      cgGroups: [data?.config?.groups?.join('\n') || ''],
      group_name: [data?.group_name || null],
      group_required: [data?.group_required ?? false],
      configMinValue: [data?.config?.min_value ?? null],
      // ── show_if ────────────────────────────────────────────────
      configShowIfIndicatorName: [data?.config?.show_if?.indicator_name || null],
      configShowIfValue: [data?.config?.show_if?.value || null],
    }) as FormGroup;

    // Guardar config raw para restaurar en sub-componentes
    (group as any)._rawConfig = data?.config || null;

    // Auto-uppercase nombre
    group.get('name')?.valueChanges.subscribe(v => {
      if (typeof v === 'string' && v !== v.toUpperCase())
        group.get('name')?.setValue(v.toUpperCase(), { emitEvent: false });
    });

    group.get('group_name')?.valueChanges.subscribe((v: string) => {
      if (typeof v === 'string' && v.includes(' ')) {
        group.get('group_name')?.setValue(v.replace(/ /g, '_'), { emitEvent: false });
      }
    });

    // Limpiar configShowIfValue si cambia el indicador padre
    group.get('configShowIfIndicatorName')?.valueChanges.subscribe(() => {
      group.get('configShowIfValue')?.setValue(null, { emitEvent: false });
    });

    // Targets
    if (this.TYPES_WITH_TARGETS.includes(fieldType)) {
      group.addControl('targets', this.buildTargetsArray(data?.targets, fieldType));
    }

    this.indicators.push(group);

    // Escuchar cambio de tipo para gestionar targets
    group.get('field_type')?.valueChanges.subscribe(newType => {
      const needsTargets = this.TYPES_WITH_TARGETS.includes(newType);
      if (needsTargets && !group.contains('targets')) {
        group.addControl('targets', this.buildTargetsArray([], newType));
      } else if (!needsTargets && group.contains('targets')) {
        group.removeControl('targets');
      }
    });
  }

  removeIndicator(i: number) {
    this.indicators.removeAt(i);
  }

  private buildTargetsArray(targets: any[], fieldType: string): FormArray {
    const arr = this.fb.array<FormGroup>([]);
    if (targets?.length) {
      targets.forEach(t => arr.push(this.fb.group({
        id: [t.id || null],
        year: [t.year, [Validators.required, Validators.min(2020), Validators.max(2100)]],
        target_value: [t.target_value, [Validators.required, Validators.min(0.0001)]]
      })));
    } else if (['number', 'sum_group', 'categorized_group'].includes(fieldType)) {
      arr.push(this.fb.group({
        id: [null],
        year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
        target_value: [null, [Validators.required, Validators.min(0.0001)]]
      }));
    }
    return arr;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  getIndicatorControls(): AbstractControl[] {
    return this.indicators.controls;
  }

  hasError(i: number, field: string): boolean {
    const c = this.indicators.at(i).get(field);
    return !!(c?.invalid && c?.touched);
  }

  getErrorMessage(i: number, field: string): string {
    const c = this.indicators.at(i).get(field);
    if (c?.hasError('required')) return 'Este campo es obligatorio';
    if (c?.hasError('minlength')) return 'Mínimo 3 caracteres';
    if (c?.hasError('min')) return 'Valor debe ser mayor a 0';
    if (c?.hasError('max')) return 'Año inválido';
    return '';
  }

  private formatSubFields(subFields?: any[]): string {
    if (!subFields?.length) return '';
    return subFields.map(sf => `${sf.name}|${sf.type}|${sf.label || sf.name}`).join('\n');
  }

  // ── Serialization ────────────────────────────────────────────────

  serializeIndicators(): any[] {
    const cgList = this.cgComponents?.toArray() || [];
    const gdList = this.gdComponents?.toArray() || [];

    return this.indicators.controls.map((ctrl, i) => {
      const ind = ctrl.value;
      const indicator: any = {
        name: ind.name.trim(),
        field_type: ind.field_type,
        is_required: ind.is_required,
        group_name: ind.group_name || null,
        group_required: ind.group_required ?? false,
        config: null,
        targets: []
      };

      switch (ind.field_type) {

        case 'number':
          if (ind.configMinValue !== null && ind.configMinValue !== '') {
            indicator.config = { min_value: Number(ind.configMinValue) };
          }
          break;

        case 'select':
        case 'multi_select':
          indicator.config = {
            options: ind.configOptions.split('\n')
              .map((o: string) => o.trim()).filter((o: string) => o.length > 0)
          };
          break;

        case 'sum_group':
          indicator.config = {
            fields: ind.configFields.split('\n')
              .map((o: string) => o.trim()).filter((o: string) => o.length > 0)
          };
          break;

        case 'grouped_data':
          indicator.config = {
            parent_field: ind.configParentField,
            auto_total: ind.configAutoTotal || false,
            sub_fields: gdList[i]?.subFields || []
          };
          break;

        case 'file_attachment': {
          const types = ind.configAllowedTypes
            ? ind.configAllowedTypes.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
            : [];
          const cfg: any = {};
          if (types.length) cfg.allowed_types = types;
          if (ind.configMaxSizeMb) cfg.max_size_mb = Number(ind.configMaxSizeMb);
          indicator.config = Object.keys(cfg).length ? cfg : null;
          break;
        }

        case 'categorized_group':
          indicator.config = cgList[i]?.getConfig() ?? null;
          break;

        case 'dataset_select':
        case 'dataset_multi_select': {

          const cfg: any = { dataset_id: ind.configDatasetId };

          if (ind.configShowIfIndicatorName) {
            cfg.show_if = {
              indicator_name: ind.configShowIfIndicatorName,
              value: ind.configShowIfValue
            };
          }

          indicator.config = cfg;
          break;
        }
      }

      if (this.TYPES_WITH_TARGETS.includes(ind.field_type) && Array.isArray(ind.targets)) {
        indicator.targets = ind.targets.map((t: any) => ({
          year: Number(t.year),
          target_value: Number(t.target_value)
        }));
      }

      return indicator;
    });
  }
}
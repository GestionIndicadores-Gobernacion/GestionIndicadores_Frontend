import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';
import { DatasetService } from '../../../../../core/services/datasets.service';

@Component({
  selector: 'app-componente-indicators-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './componente-indicators-form.html'
})
export class ComponenteIndicatorsFormComponent {

  @Input() parentForm!: FormGroup;

  private subFieldsArrays: Map<number, any[]> = new Map();

  // Estado para categorized_group (métricas y sub-secciones son arrays en memoria)
  private cgMetricsArrays: Map<number, any[]> = new Map();
  private cgSubSectionsArrays: Map<number, any[]> = new Map();

  // =====================
  // DRAG & DROP STATE
  // =====================
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;

  // Dataset state para el panel de configuración
  allDatasets: any[] = [];
  datasetTablesMap: Map<number, any[]> = new Map(); // dataset_id → tables[]
  datasetsLoading = false;

  constructor(private fb: FormBuilder, private datasetService: DatasetService) { }

  // =====================
  // GETTERS
  // =====================

  get indicators(): FormArray {
    return this.parentForm.get('indicators') as FormArray;
  }

  // =====================
  // DRAG & DROP
  // =====================

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
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onDragLeave(event: DragEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      this.dragOverIndex = null;
    }
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
      this.resetDragState();
      return;
    }
    this.moveIndicator(this.draggedIndex, dropIndex);
    this.resetDragState();
  }

  onDragEnd() { this.resetDragState(); }

  private resetDragState() {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }

  private moveIndicator(fromIndex: number, toIndex: number) {
    const indicators = this.indicators;
    const control = indicators.at(fromIndex);

    // Remap all index-keyed maps
    [this.subFieldsArrays, this.cgMetricsArrays, this.cgSubSectionsArrays].forEach(map => {
      const newMap = new Map<number, any[]>();
      map.forEach((value, key) => {
        if (key === fromIndex) {
          newMap.set(toIndex, value);
        } else {
          let newKey = key;
          if (fromIndex < toIndex) {
            if (key > fromIndex && key <= toIndex) newKey = key - 1;
          } else {
            if (key >= toIndex && key < fromIndex) newKey = key + 1;
          }
          newMap.set(newKey, value);
        }
      });
      map.clear();
      newMap.forEach((v, k) => map.set(k, v));
    });

    indicators.removeAt(fromIndex);
    indicators.insert(toIndex, control);
  }

  // =====================
  // SANITIZACIÓN
  // =====================

  sanitizeTechnicalName(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  capitalizeWords(value: string): string {
    return value.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  sanitizeOption(value: string): string {
    return value.trim().toUpperCase();
  }

  sanitizeOptionsOnBlur(indicatorIndex: number) {
    const control = this.indicators.at(indicatorIndex).get('configOptions');
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => this.sanitizeOption(line))
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }

  sanitizeFieldsOnBlur(indicatorIndex: number) {
    const control = this.indicators.at(indicatorIndex).get('configFields');
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => this.capitalizeWords(line.trim()))
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }

  /** Sanitiza opciones de categorized_group (MAYÚSCULAS) */
  sanitizeCgOptionsOnBlur(indicatorIndex: number, controlName: string) {
    const control = this.indicators.at(indicatorIndex).get(controlName);
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => line.trim().toUpperCase())
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }

  /** Sanitiza grupos de categorized_group (Primera Mayúscula) */
  sanitizeCgFieldsOnBlur(indicatorIndex: number, controlName: string) {
    const control = this.indicators.at(indicatorIndex).get(controlName);
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => this.capitalizeWords(line.trim()))
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }

  // =====================
  // INDICATORS CRUD
  // =====================

  addIndicator(data?: any) {
    const fieldType = data?.field_type || 'text';

    const group: FormGroup = this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', [Validators.required, Validators.minLength(3)]],
      field_type: [fieldType, Validators.required],
      is_required: [data?.is_required ?? true],

      // existing config controls
      configOptions: [data?.config?.options?.join('\n') || ''],
      configFields: [data?.config?.fields?.join('\n') || ''],
      configParentField: [data?.config?.parent_field || null],
      configAutoTotal: [data?.config?.auto_total || false],
      configSubFields: [this.formatSubFieldsForTextarea(data?.config?.sub_fields) || ''],
      configAllowedTypes: [data?.config?.allowed_types?.join(', ') || ''],
      configMaxSizeMb: [data?.config?.max_size_mb || null],

      configDatasetId: [data?.config?.dataset_id || null],
      configTableId: [data?.config?.table_id || null],
      configLabelField: [data?.config?.label_field || ''],

      // categorized_group controls
      cgCategoryLabel: [data?.config?.category_label || ''],
      cgCategories: [data?.config?.categories?.join('\n') || ''],
      cgGroups: [data?.config?.groups?.join('\n') || ''],
    }) as FormGroup;

    // Auto-uppercase name
    group.get('name')?.valueChanges.subscribe(value => {
      if (value && typeof value === 'string') {
        const sanitized = value.toUpperCase();
        if (sanitized !== value) group.get('name')?.setValue(sanitized, { emitEvent: false });
      }
    });

    const indicatorIndex = this.indicators.length;

    // Inicializar métricas y sub-secciones de categorized_group
    if (fieldType === 'categorized_group') {
      this.cgMetricsArrays.set(indicatorIndex, data?.config?.metrics || []);
      this.cgSubSectionsArrays.set(indicatorIndex, data?.config?.sub_sections || []);
    }

    // Targets
    const typesWithTargets = ['number', 'sum_group', 'grouped_data', 'categorized_group'];
    if (typesWithTargets.includes(fieldType)) {
      const targetsArray = this.fb.array<FormGroup>([]);

      if (data?.targets?.length) {
        data.targets.forEach((t: any) => {
          targetsArray.push(this.fb.group({
            id: [t.id || null],
            year: [t.year, [Validators.required, Validators.min(2020), Validators.max(2100)]],
            target_value: [t.target_value, [Validators.required, Validators.min(0.0001)]]
          }));
        });
      } else if (fieldType === 'number' || fieldType === 'sum_group' || fieldType === 'categorized_group') {
        targetsArray.push(this.fb.group({
          id: [null],
          year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
          target_value: [null, [Validators.required, Validators.min(0.0001)]]
        }));
      }

      group.addControl('targets', targetsArray);
    }

    this.indicators.push(group);

    // Escuchar cambios de tipo para agregar/quitar targets
    group.get('field_type')?.valueChanges.subscribe((newType: string) => {
      this.onFieldTypeChange(group, newType, this.indicators.length - 1);
    });
  }

  removeIndicator(i: number) {
    this.indicators.removeAt(i);
    this.shiftMapsAfterRemoval(i);
  }

  /**
   * Cuando se elimina el indicador en el índice `removedIndex`,
   * todos los índices superiores deben bajar 1 en los Maps.
   */
  private shiftMapsAfterRemoval(removedIndex: number) {
    [this.subFieldsArrays, this.cgMetricsArrays, this.cgSubSectionsArrays].forEach(map => {
      const newMap = new Map<number, any[]>();
      map.forEach((value, key) => {
        if (key === removedIndex) return; // eliminar esta entrada
        const newKey = key > removedIndex ? key - 1 : key;
        newMap.set(newKey, value);
      });
      map.clear();
      newMap.forEach((v, k) => map.set(k, v));
    });
  }

  private onFieldTypeChange(indicatorGroup: FormGroup, newType: string, idx: number) {
    const typesWithTargets = ['number', 'sum_group', 'grouped_data', 'categorized_group'];
    const needsTargets = typesWithTargets.includes(newType);
    const hasTargets = indicatorGroup.contains('targets');

    if (needsTargets && !hasTargets) {
      const targetsArray = this.fb.array<FormGroup>([]);
      if (newType === 'number' || newType === 'sum_group' || newType === 'categorized_group') {
        targetsArray.push(this.fb.group({
          id: [null],
          year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
          target_value: [null, [Validators.required, Validators.min(0.0001)]]
        }));
      }
      indicatorGroup.addControl('targets', targetsArray);
    } else if (!needsTargets && hasTargets) {
      indicatorGroup.removeControl('targets');
    }

    // Inicializar arrays de categorized_group si se cambia al tipo
    if (newType === 'categorized_group' && !this.cgMetricsArrays.has(idx)) {
      this.cgMetricsArrays.set(idx, []);
      this.cgSubSectionsArrays.set(idx, []);
    }
  }

  // =====================
  // TARGETS
  // =====================

  getTargets(indicatorIndex: number): FormArray<FormGroup> {
    const targetsControl = this.indicators.at(indicatorIndex).get('targets');
    return (targetsControl as FormArray<FormGroup>) || this.fb.array<FormGroup>([]);
  }

  addTarget(indicatorIndex: number) {
    this.getTargets(indicatorIndex).push(this.fb.group({
      id: [null],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
      target_value: [null, [Validators.required, Validators.min(0.0001)]]
    }));
  }

  removeTarget(indicatorIndex: number, targetIndex: number) {
    this.getTargets(indicatorIndex).removeAt(targetIndex);
  }

  // =====================
  // GROUPED_DATA SUB-FIELDS
  // =====================

  getSubFields(indicatorIndex: number): any[] {
    if (this.subFieldsArrays.has(indicatorIndex)) {
      return this.subFieldsArrays.get(indicatorIndex)!;
    }
    const configSubFields = this.indicators.at(indicatorIndex).get('configSubFields')?.value;
    const subFields = configSubFields?.trim()
      ? this.parseSubFieldsFromTextarea(configSubFields)
      : [];
    this.subFieldsArrays.set(indicatorIndex, subFields);
    return subFields;
  }

  addSubField(indicatorIndex: number) {
    this.getSubFields(indicatorIndex).push({ name: '', type: 'number', label: '' });
    this.syncSubFieldsToForm(indicatorIndex);
  }

  removeSubField(indicatorIndex: number, subFieldIndex: number) {
    this.getSubFields(indicatorIndex).splice(subFieldIndex, 1);
    this.syncSubFieldsToForm(indicatorIndex);
  }

  updateSubField(indicatorIndex: number, subFieldIndex: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    const subFields = this.getSubFields(indicatorIndex);
    if (!subFields[subFieldIndex]) return;
    if (field === 'name') value = this.sanitizeTechnicalName(value);
    else if (field === 'label') value = this.capitalizeWords(value);
    subFields[subFieldIndex][field] = value;
    this.syncSubFieldsToForm(indicatorIndex);
  }

  private syncSubFieldsToForm(indicatorIndex: number) {
    const formatted = this.formatSubFieldsForTextarea(this.getSubFields(indicatorIndex));
    this.indicators.at(indicatorIndex).get('configSubFields')?.setValue(formatted, { emitEvent: false });
  }

  // =====================
  // CATEGORIZED_GROUP: MÉTRICAS
  // =====================

  getCgMetrics(indicatorIndex: number): any[] {
    if (!this.cgMetricsArrays.has(indicatorIndex)) {
      this.cgMetricsArrays.set(indicatorIndex, []);
    }
    return this.cgMetricsArrays.get(indicatorIndex)!;
  }

  addCgMetric(indicatorIndex: number) {
    this.getCgMetrics(indicatorIndex).push({ key: '', label: '' });
  }

  removeCgMetric(indicatorIndex: number, metricIndex: number) {
    this.getCgMetrics(indicatorIndex).splice(metricIndex, 1);
  }

  updateCgMetric(indicatorIndex: number, metricIndex: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    const metrics = this.getCgMetrics(indicatorIndex);
    if (!metrics[metricIndex]) return;
    if (field === 'key') value = this.sanitizeTechnicalName(value);
    metrics[metricIndex][field] = value;
  }

  // =====================
  // CATEGORIZED_GROUP: SUB-SECCIONES
  // =====================

  getCgSubSections(indicatorIndex: number): any[] {
    if (!this.cgSubSectionsArrays.has(indicatorIndex)) {
      this.cgSubSectionsArrays.set(indicatorIndex, []);
    }
    return this.cgSubSectionsArrays.get(indicatorIndex)!;
  }

  addCgSubSection(indicatorIndex: number) {
    this.getCgSubSections(indicatorIndex).push({
      key: '',
      label: '',
      max_source: 'metrics_total'
    });
  }

  removeCgSubSection(indicatorIndex: number, sectionIndex: number) {
    this.getCgSubSections(indicatorIndex).splice(sectionIndex, 1);
  }

  updateCgSubSection(indicatorIndex: number, sectionIndex: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    const sections = this.getCgSubSections(indicatorIndex);
    if (!sections[sectionIndex]) return;
    if (field === 'key') value = this.sanitizeTechnicalName(value);
    sections[sectionIndex][field] = value;
  }

  // =====================
  // HELPERS
  // =====================

  getMultiSelectIndicators(currentIndex: number): AbstractControl[] {
    return this.indicators.controls
      .slice(0, currentIndex)
      .filter(ind => ind.get('field_type')?.value === 'multi_select');
  }

  formatSubFieldsForTextarea(subFields?: any[]): string {
    if (!subFields?.length) return '';
    return subFields.map(sf => `${sf.name}|${sf.type}|${sf.label || sf.name}`).join('\n');
  }

  parseSubFieldsFromTextarea(text: string): any[] {
    if (!text?.trim()) return [];
    return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return { name: parts[0] || '', type: parts[1] || 'number', label: parts[2] || parts[0] || '' };
    });
  }

  // =====================
  // VALIDACIÓN
  // =====================

  hasError(indicatorIndex: number, fieldName: string): boolean {
    const control = this.indicators.at(indicatorIndex).get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  getErrorMessage(indicatorIndex: number, fieldName: string): string {
    const control = this.indicators.at(indicatorIndex).get(fieldName);
    if (control?.hasError('required')) return 'Este campo es obligatorio';
    if (control?.hasError('minlength')) return 'Mínimo 3 caracteres';
    if (control?.hasError('min')) return 'Valor debe ser mayor a 0';
    if (control?.hasError('max')) return 'Año inválido';
    return '';
  }

  // =====================
  // SERIALIZATION
  // =====================

  serializeIndicators(): any[] {
    return this.indicators.controls.map((control, i) => {
      const ind = control.value;

      const indicator: any = {
        name: ind.name.trim(),
        field_type: ind.field_type,
        is_required: ind.is_required,
        config: null,
        targets: []
      };

      if (ind.field_type === 'select' || ind.field_type === 'multi_select') {
        indicator.config = {
          options: ind.configOptions
            .split('\n')
            .map((o: string) => o.trim())
            .filter((o: string) => o.length > 0)
        };

      } else if (ind.field_type === 'sum_group') {
        indicator.config = {
          fields: ind.configFields
            .split('\n')
            .map((o: string) => o.trim())
            .filter((o: string) => o.length > 0)
        };

      } else if (ind.field_type === 'grouped_data') {
        indicator.config = {
          parent_field: ind.configParentField,
          auto_total: ind.configAutoTotal || false,
          sub_fields: this.parseSubFieldsFromTextarea(ind.configSubFields)
        };

      } else if (ind.field_type === 'file_attachment') {
        const allowedTypes = ind.configAllowedTypes
          ? ind.configAllowedTypes.split(',').map((t: string) => t.trim().toLowerCase()).filter((t: string) => t.length > 0)
          : [];
        indicator.config = {
          ...(allowedTypes.length > 0 && { allowed_types: allowedTypes }),
          ...(ind.configMaxSizeMb && { max_size_mb: Number(ind.configMaxSizeMb) })
        };
        if (Object.keys(indicator.config).length === 0) indicator.config = null;

      } else if (ind.field_type === 'categorized_group') {
        const categories = ind.cgCategories
          ? ind.cgCategories.split('\n').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
          : [];
        const groups = ind.cgGroups
          ? ind.cgGroups.split('\n').map((g: string) => g.trim()).filter((g: string) => g.length > 0)
          : [];

        const metrics = (this.cgMetricsArrays.get(i) || [])
          .filter((m: any) => m.key && m.label);

        const subSections = (this.cgSubSectionsArrays.get(i) || [])
          .filter((s: any) => s.key && s.label)
          .map((s: any) => ({ ...s, max_source: 'metrics_total' }));

        indicator.config = {
          category_label: ind.cgCategoryLabel?.trim() || '',
          categories,
          groups,
          metrics,
          ...(subSections.length > 0 && { sub_sections: subSections })
        };
      } else if (ind.field_type === 'dataset_select' || ind.field_type === 'dataset_multi_select') {
        indicator.config = {
          dataset_id: ind.configDatasetId,
          table_id: ind.configTableId,
          label_field: ind.configLabelField || 'id'
        };
      }

      // Targets
      const typesWithTargets = ['number', 'sum_group', 'grouped_data', 'categorized_group'];
      if (typesWithTargets.includes(ind.field_type) && ind.targets && Array.isArray(ind.targets)) {
        indicator.targets = ind.targets.map((t: any) => ({
          year: Number(t.year),
          target_value: Number(t.target_value)
        }));
      }

      return indicator;
    });
  }
}
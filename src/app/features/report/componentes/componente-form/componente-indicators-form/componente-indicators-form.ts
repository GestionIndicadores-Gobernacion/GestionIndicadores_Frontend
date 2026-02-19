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

@Component({
  selector: 'app-componente-indicators-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './componente-indicators-form.html'
})
export class ComponenteIndicatorsFormComponent {

  @Input() parentForm!: FormGroup;

  private subFieldsArrays: Map<number, any[]> = new Map();

  // =====================
  // DRAG & DROP STATE
  // =====================
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;

  constructor(private fb: FormBuilder) { }

  // =====================
  // GETTERS
  // =====================

  get indicators(): FormArray {
    return this.parentForm.get('indicators') as FormArray;
  }

  // =====================
  // DRAG & DROP HANDLERS
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
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.dragOverIndex = index;
    }
  }

  onDragLeave(event: DragEvent) {
    // Solo limpiar si salimos del contenedor del indicador
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

  onDragEnd() {
    this.resetDragState();
  }

  private resetDragState() {
    this.draggedIndex = null;
    this.dragOverIndex = null;
  }

  private moveIndicator(fromIndex: number, toIndex: number) {
    const indicators = this.indicators;
    const control = indicators.at(fromIndex);

    // Reconstruir subFieldsArrays con los nuevos índices
    const newSubFieldsArrays: Map<number, any[]> = new Map();
    this.subFieldsArrays.forEach((value, key) => {
      if (key === fromIndex) {
        newSubFieldsArrays.set(toIndex, value);
      } else {
        let newKey = key;
        if (fromIndex < toIndex) {
          // Moviendo hacia abajo: los que estaban entre from+1 y to bajan un índice
          if (key > fromIndex && key <= toIndex) newKey = key - 1;
        } else {
          // Moviendo hacia arriba: los que estaban entre to y from-1 suben un índice
          if (key >= toIndex && key < fromIndex) newKey = key + 1;
        }
        newSubFieldsArrays.set(newKey, value);
      }
    });
    this.subFieldsArrays = newSubFieldsArrays;

    // Mover el control en el FormArray
    indicators.removeAt(fromIndex);
    indicators.insert(toIndex, control);
  }

  // =====================
  // SANITIZACIÓN Y VALIDACIÓN
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
    return value
      .split(' ')
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

  // =====================
  // INDICATORS CRUD
  // =====================

  addIndicator(data?: any) {
    const group: FormGroup = this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', [Validators.required, Validators.minLength(3)]],
      field_type: [data?.field_type || 'text', Validators.required],
      is_required: [data?.is_required ?? true],
      configOptions: [data?.config?.options?.join('\n') || ''],
      configFields: [data?.config?.fields?.join('\n') || ''],
      configParentField: [data?.config?.parent_field || null],
      configAutoTotal: [data?.config?.auto_total || false],
      configSubFields: [this.formatSubFieldsForTextarea(data?.config?.sub_fields) || ''],
      configAllowedTypes: [data?.config?.allowed_types?.join(', ') || ''],   // ← AGREGAR
      configMaxSizeMb: [data?.config?.max_size_mb || null]                   // ← AGREGAR
    }) as FormGroup;

    group.get('name')?.valueChanges.subscribe(value => {
      if (value && typeof value === 'string') {
        const sanitized = value.toUpperCase();
        if (sanitized !== value) {
          group.get('name')?.setValue(sanitized, { emitEvent: false });
        }
      }
    });

    const fieldType = data?.field_type || 'text';
    if (fieldType === 'number' || fieldType === 'sum_group' || fieldType === 'grouped_data') {

      const targetsArray = this.fb.array<FormGroup>([]);

      if (data?.targets?.length) {
        data.targets.forEach((t: any) => {
          targetsArray.push(
            this.fb.group({
              id: [t.id || null],
              year: [t.year, [Validators.required, Validators.min(2020), Validators.max(2100)]],
              target_value: [t.target_value, [Validators.required, Validators.min(0.0001)]]
            })
          );
        });
      } else if (fieldType === 'number' || fieldType === 'sum_group') {
        targetsArray.push(
          this.fb.group({
            id: [null],
            year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
            target_value: [null, [Validators.required, Validators.min(0.0001)]]
          })
        );
      }

      group.addControl('targets', targetsArray);
    }

    this.indicators.push(group);

    group.get('field_type')?.valueChanges.subscribe((newType: string) => {
      this.onFieldTypeChange(group, newType);
    });
  }

  removeIndicator(i: number) {
    this.indicators.removeAt(i);
    this.subFieldsArrays.delete(i);
  }

  private onFieldTypeChange(indicatorGroup: FormGroup, newType: string) {
    const needsTargets = newType === 'number' || newType === 'sum_group' || newType === 'grouped_data';
    const hasTargets = indicatorGroup.contains('targets');

    if (needsTargets && !hasTargets) {
      const targetsArray = this.fb.array<FormGroup>([]);

      if (newType === 'number' || newType === 'sum_group') {
        targetsArray.push(
          this.fb.group({
            id: [null],
            year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
            target_value: [null, [Validators.required, Validators.min(0.0001)]]
          })
        );
      }

      indicatorGroup.addControl('targets', targetsArray);
    } else if (!needsTargets && hasTargets) {
      indicatorGroup.removeControl('targets');
    }
  }

  // =====================
  // TARGETS
  // =====================

  getTargets(indicatorIndex: number): FormArray<FormGroup> {
    const targetsControl = this.indicators.at(indicatorIndex).get('targets');
    return targetsControl as FormArray<FormGroup> || this.fb.array<FormGroup>([]);
  }

  addTarget(indicatorIndex: number) {
    const targetsArray = this.getTargets(indicatorIndex);
    targetsArray.push(
      this.fb.group({
        id: [null],
        year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
        target_value: [null, [Validators.required, Validators.min(0.0001)]]
      })
    );
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

    const indicator = this.indicators.at(indicatorIndex);
    const configSubFields = indicator.get('configSubFields')?.value;

    let subFields: any[] = [];

    if (configSubFields && configSubFields.trim()) {
      subFields = this.parseSubFieldsFromTextarea(configSubFields);
    }

    this.subFieldsArrays.set(indicatorIndex, subFields);
    return subFields;
  }

  addSubField(indicatorIndex: number) {
    const subFields = this.getSubFields(indicatorIndex);
    subFields.push({ name: '', type: 'number', label: '' });
    this.syncSubFieldsToForm(indicatorIndex);
  }

  removeSubField(indicatorIndex: number, subFieldIndex: number) {
    const subFields = this.getSubFields(indicatorIndex);
    subFields.splice(subFieldIndex, 1);
    this.syncSubFieldsToForm(indicatorIndex);
  }

  updateSubField(indicatorIndex: number, subFieldIndex: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    const subFields = this.getSubFields(indicatorIndex);

    if (subFields[subFieldIndex]) {
      if (field === 'name') {
        value = this.sanitizeTechnicalName(value);
      } else if (field === 'label') {
        value = this.capitalizeWords(value);
      }

      subFields[subFieldIndex][field] = value;
      this.syncSubFieldsToForm(indicatorIndex);
    }
  }

  private syncSubFieldsToForm(indicatorIndex: number) {
    const subFields = this.getSubFields(indicatorIndex);
    const formatted = this.formatSubFieldsForTextarea(subFields);
    this.indicators.at(indicatorIndex).get('configSubFields')?.setValue(formatted, { emitEvent: false });
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
    if (!subFields || !subFields.length) return '';
    return subFields.map(sf => `${sf.name}|${sf.type}|${sf.label || sf.name}`).join('\n');
  }

  parseSubFieldsFromTextarea(text: string): any[] {
    if (!text?.trim()) return [];

    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          name: parts[0] || '',
          type: parts[1] || 'number',
          label: parts[2] || parts[0] || ''
        };
      });
  }

  // =====================
  // VALIDACIÓN DE ERRORES
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
    return this.indicators.value.map((i: any) => {
      const indicator: any = {
        name: i.name.trim(),
        field_type: i.field_type,
        is_required: i.is_required,
        config: null,
        targets: []
      };

      if (i.field_type === 'select' || i.field_type === 'multi_select') {
        indicator.config = {
          options: i.configOptions
            .split('\n')
            .map((o: string) => o.trim())
            .filter((o: string) => o.length > 0)
        };
      } else if (i.field_type === 'sum_group') {
        indicator.config = {
          fields: i.configFields
            .split('\n')
            .map((o: string) => o.trim())
            .filter((o: string) => o.length > 0)
        };
      } else if (i.field_type === 'grouped_data') {
        indicator.config = {
          parent_field: i.configParentField,
          auto_total: i.configAutoTotal || false,
          sub_fields: this.parseSubFieldsFromTextarea(i.configSubFields)
        };
      } else if (i.field_type === 'file_attachment') {              // ← NUEVO
        const allowedTypes = i.configAllowedTypes
          ? i.configAllowedTypes
            .split(',')
            .map((t: string) => t.trim().toLowerCase())
            .filter((t: string) => t.length > 0)
          : [];

        indicator.config = {
          ...(allowedTypes.length > 0 && { allowed_types: allowedTypes }),
          ...(i.configMaxSizeMb && { max_size_mb: Number(i.configMaxSizeMb) })
        };

        if (Object.keys(indicator.config).length === 0) {
          indicator.config = null;
        }
      }

      if (i.field_type === 'number' || i.field_type === 'sum_group' || i.field_type === 'grouped_data') {
        if (i.targets && Array.isArray(i.targets)) {
          indicator.targets = i.targets.map((t: any) => ({
            year: Number(t.year),
            target_value: Number(t.target_value)
          }));
        }
      }

      return indicator;
    });
  }
}
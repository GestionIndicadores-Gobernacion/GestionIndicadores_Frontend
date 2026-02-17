import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../core/models/component.model';

@Component({
  selector: 'app-report-indicators-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-indicators-form.html'
})
export class ReportIndicatorsFormComponent implements OnChanges {

  @Input() indicators: ComponentIndicatorModel[] = [];
  @Input() reportDate!: string;

  @Input() values: Record<number, any> = {};
  @Output() valuesChange = new EventEmitter<Record<number, any>>();

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando cambian los indicadores o los valores, inicializar grouped_data
    if (changes['indicators'] || changes['values']) {
      this.initializeGroupedDataIndicators();
    }
  }

  // =========================
  // INITIALIZE GROUPED DATA
  // =========================

  private initializeGroupedDataIndicators(): void {
    this.indicators.forEach(ind => {
      if (ind.field_type === 'grouped_data') {
        const selectedGroups = this.getSelectedOptionsForGroupedData(ind);

        if (!this.values[ind.id!]) {
          this.values[ind.id!] = {};
        }

        // Para cada grupo seleccionado, inicializar todos los sub-campos
        selectedGroups.forEach(groupKey => {
          if (!this.values[ind.id!][groupKey]) {
            this.values[ind.id!][groupKey] = {};
          }

          // Inicializar cada sub-campo si no existe
          ind.config?.sub_fields?.forEach((subField: any) => {
            if (!(subField.name in this.values[ind.id!][groupKey])) {
              // Inicializar según el tipo - números con 0, texto con string vacío
              if (subField.type === 'number') {
                this.values[ind.id!][groupKey][subField.name] = 0;
              } else {
                this.values[ind.id!][groupKey][subField.name] = '';
              }
            }
          });
        });

        // Eliminar grupos que ya no están seleccionados
        const currentGroups = Object.keys(this.values[ind.id!] || {});
        currentGroups.forEach(groupKey => {
          if (!selectedGroups.includes(groupKey)) {
            delete this.values[ind.id!][groupKey];
          }
        });
      }
    });
  }

  // =========================
  // VALUE SETTERS
  // =========================

  setValue(indicatorId: number, value: any) {
    this.values[indicatorId] = value;
    this.emit();
  }

  setSumValue(indicatorId: number, field: string, value: any) {
    if (!this.values[indicatorId]) {
      this.values[indicatorId] = {};
    }
    // Convertir a número, si está vacío usar 0
    if (value !== '' && value !== null && value !== undefined) {
      const numValue = Number(value);
      this.values[indicatorId][field] = !isNaN(numValue) ? numValue : 0;
    } else {
      this.values[indicatorId][field] = 0;
    }
    this.emit();
  }

  // =========================
  // MULTI-SELECT
  // =========================

  toggleMultiSelectOption(indicatorId: number, option: string) {
    if (!this.values[indicatorId]) {
      this.values[indicatorId] = [];
    }

    const index = this.values[indicatorId].indexOf(option);
    if (index > -1) {
      this.values[indicatorId].splice(index, 1);
    } else {
      this.values[indicatorId].push(option);
    }

    // Si este es un indicador padre de grouped_data, reinicializar
    this.initializeGroupedDataIndicators();
    this.emit();
  }

  isMultiSelectSelected(indicatorId: number, option: string): boolean {
    return this.values[indicatorId]?.includes(option) || false;
  }

  // =========================
  // GROUPED DATA
  // =========================

  setGroupedValue(indicatorId: number, groupKey: string, fieldName: string, value: any) {
    if (!this.values[indicatorId]) {
      this.values[indicatorId] = {};
    }
    if (!this.values[indicatorId][groupKey]) {
      this.values[indicatorId][groupKey] = {};
    }

    const subField = this.getSubFieldConfig(indicatorId, fieldName);

    if (subField?.type === 'number') {
      // Para números: almacenar como número, si está vacío usar 0
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        this.values[indicatorId][groupKey][fieldName] = !isNaN(numValue) ? numValue : 0;
      } else {
        this.values[indicatorId][groupKey][fieldName] = 0;
      }
    } else {
      // Para texto: almacenar como string, si está vacío usar string vacío
      this.values[indicatorId][groupKey][fieldName] = value ? String(value) : '';
    }

    this.emit();
  }

  getGroupedValue(indicatorId: number, groupKey: string, fieldName: string): any {
    const value = this.values[indicatorId]?.[groupKey]?.[fieldName];

    // Retornar valor apropiado según el tipo
    const subField = this.getSubFieldConfig(indicatorId, fieldName);
    if (subField?.type === 'number') {
      // Para inputs de tipo number, retornar el número o 0 si está vacío
      return value !== null && value !== undefined && value !== '' ? value : 0;
    }
    // Para texto, retornar string vacío si no hay valor
    return value !== null && value !== undefined ? value : '';
  }

  getSelectedOptionsForGroupedData(ind: ComponentIndicatorModel): string[] {
    if (!ind.config?.parent_field) return [];

    const parentIndicator = this.indicators.find(i => i.name === ind.config?.parent_field);
    if (!parentIndicator) return [];

    return this.values[parentIndicator.id!] || [];
  }

  getSubFieldConfig(indicatorId: number, fieldName: string): any {
    const indicator = this.indicators.find(i => i.id === indicatorId);
    return indicator?.config?.sub_fields?.find((f: any) => f.name === fieldName);
  }

  // =========================
  // HELPERS
  // =========================

  getSumTotal(indicatorId: number): number {
    const obj = this.values[indicatorId];
    if (!obj) return 0;
    return Object.values(obj).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }

  getTarget(ind: ComponentIndicatorModel): number | null {
    // Para grouped_data, buscar la meta en el indicador o en las metas del componente
    if (ind.field_type === 'grouped_data') {
      // Si el indicador tiene targets propios, usarlos
      if (this.reportDate && ind.targets?.length) {
        const year = new Date(this.reportDate).getFullYear();
        const t = ind.targets.find(t => t.year === year);
        if (t) return t.target_value;
      }
      // Si no, mostrar "Sin meta" (que es correcto para grouped_data)
      return null;
    }

    // Para number y sum_group, buscar metas normalmente
    if (ind.field_type !== 'number' && ind.field_type !== 'sum_group') {
      return null;
    }

    if (!this.reportDate || !ind.targets?.length) {
      return null;
    }

    const year = new Date(this.reportDate).getFullYear();
    const t = ind.targets.find(t => t.year === year);
    return t ? t.target_value : null;
  }

  emit() {
    this.valuesChange.emit({ ...this.values });
  }

  getIndicatorId(ind: ComponentIndicatorModel): number {
    return ind.id!;
  }

  // =========================
  // VALIDATION
  // =========================

  isIndicatorValid(ind: ComponentIndicatorModel): boolean {
    if (!ind.is_required) return true;

    const value = this.values[ind.id!];

    switch (ind.field_type) {
      case 'select':
        return value !== null && value !== undefined && value !== '';

      case 'multi_select':
        return Array.isArray(value) && value.length > 0;

      case 'number':
        return value !== null && value !== undefined && value !== '';

      case 'text':
        return value !== null && value !== undefined && value.trim() !== '';

      case 'sum_group':
        // Al menos un campo debe tener valor > 0
        if (!value || typeof value !== 'object') return false;
        return Object.values(value).some(v => Number(v) > 0);

      case 'grouped_data':
        // Todos los grupos seleccionados deben tener al menos un campo con valor
        if (!value || typeof value !== 'object') return false;
        const groups = Object.keys(value);
        if (groups.length === 0) return false;
        return groups.every(groupKey => {
          const groupData = value[groupKey];
          return Object.values(groupData).some(v => v !== null && v !== undefined && v !== '' && v !== 0);
        });

      default:
        return true;
    }
  }

  // =========================
  // GROUPED DATA - TOTAL AUTOMÁTICO
  // =========================

  getGroupedTotal(indicatorId: number, groupKey: string, subFields: any[]): number {
    const groupData = this.values[indicatorId]?.[groupKey];
    if (!groupData) return 0;

    let total = 0;
    for (const subField of subFields) {
      if (subField.type === 'number') {
        const value = groupData[subField.name];
        if (value && !isNaN(value)) {
          total += Number(value);
        }
      }
    }
    return total;
  }

  // TOTAL GENERAL (suma de todos los grupos)
  getGroupedGrandTotal(indicatorId: number, subFields: any[]): number {
    const allGroups = this.values[indicatorId];
    if (!allGroups || typeof allGroups !== 'object') return 0;

    let grandTotal = 0;
    Object.keys(allGroups).forEach(groupKey => {
      grandTotal += this.getGroupedTotal(indicatorId, groupKey, subFields);
    });
    return grandTotal;
  }
}
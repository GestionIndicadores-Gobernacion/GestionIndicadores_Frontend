import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../core/models/component.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment.prod';

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

  // Estado de uploads
  uploadingFor: number | null = null;
  uploadErrors: Record<number, string> = {};

  constructor(private http: HttpClient) { }

  ngOnChanges(changes: SimpleChanges): void {
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

        // Inicializar sub-campos para grupos seleccionados
        selectedGroups.forEach(groupKey => {
          if (!this.values[ind.id!][groupKey]) {
            this.values[ind.id!][groupKey] = {};
          }

          ind.config?.sub_fields?.forEach((subField: any) => {
            if (!(subField.name in this.values[ind.id!][groupKey])) {
              if (subField.type === 'number') {
                this.values[ind.id!][groupKey][subField.name] = 0;
              } else {
                this.values[ind.id!][groupKey][subField.name] = '';
              }
            }
          });
        });

        // Solo eliminar grupos que no están seleccionados SI hay grupos seleccionados
        // Si selectedGroups está vacío (valores aún no cargados), no borrar nada
        if (selectedGroups.length > 0) {
          const currentGroups = Object.keys(this.values[ind.id!] || {});
          currentGroups.forEach(groupKey => {
            if (!selectedGroups.includes(groupKey)) {
              delete this.values[ind.id!][groupKey];
            }
          });
        }
      }
    });
  }

  // =========================
  // VALUE SETTERS
  // =========================

  setValue(indicatorId: number, value: any) {
    this.values[indicatorId] = value;
    // Reinicializar grouped_data cuando cambia un multi_select
    this.initializeGroupedDataIndicators();
    this.emit();
  }

  setSumValue(indicatorId: number, field: string, value: any) {
    if (!this.values[indicatorId]) {
      this.values[indicatorId] = {};
    }
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

    // Reinicializar grouped_data cuando cambia el multi_select padre
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
    const subField = this.getSubFieldConfig(indicatorId, fieldName);

    let parsedValue: any;
    if (subField?.type === 'number') {
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        parsedValue = !isNaN(numValue) ? numValue : 0;
      } else {
        parsedValue = 0;
      }
    } else {
      parsedValue = value ? String(value) : '';
    }

    this.values = {
      ...this.values,
      [indicatorId]: {
        ...this.values[indicatorId],
        [groupKey]: {
          ...(this.values[indicatorId]?.[groupKey] || {}),
          [fieldName]: parsedValue
        }
      }
    };

    this.emit();
  }

  getGroupedValue(indicatorId: number, groupKey: string, fieldName: string): any {
    const value = this.values[indicatorId]?.[groupKey]?.[fieldName];
    const subField = this.getSubFieldConfig(indicatorId, fieldName);
    if (subField?.type === 'number') {
      return value !== null && value !== undefined && value !== '' ? value : 0;
    }
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
    if (ind.field_type === 'grouped_data') {
      if (this.reportDate && ind.targets?.length) {
        const year = new Date(this.reportDate).getFullYear();
        const t = ind.targets.find(t => t.year === year);
        if (t) return t.target_value;
      }
      return null;
    }

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
        if (!value || typeof value !== 'object') return false;
        return Object.values(value).some(v => Number(v) > 0);
      case 'grouped_data':
        if (!value || typeof value !== 'object') return false;
        const groups = Object.keys(value);
        if (groups.length === 0) return false;
        return groups.every(groupKey => {
          const groupData = value[groupKey];
          return Object.values(groupData).some(v => v !== null && v !== undefined && v !== '' && v !== 0);
        });
      case 'file_attachment':
        return value !== null && value !== undefined && !!value.file_url;
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

  getGroupedGrandTotal(indicatorId: number, subFields: any[]): number {
    const allGroups = this.values[indicatorId];
    if (!allGroups || typeof allGroups !== 'object') return 0;

    let grandTotal = 0;
    Object.keys(allGroups).forEach(groupKey => {
      grandTotal += this.getGroupedTotal(indicatorId, groupKey, subFields);
    });
    return grandTotal;
  }

  // =========================
  // FILE ATTACHMENT
  // =========================

  getFileValue(indicatorId: number): { file_name: string; file_url: string; file_size_mb: number } | null {
    const val = this.values[indicatorId];
    if (val && typeof val === 'object' && val.file_url) return val;
    return null;
  }

  getAcceptString(ind: ComponentIndicatorModel): string {
    const types = ind.config?.allowed_types;
    if (!types || types.length === 0) return '*/*';
    return types.map((t: string) => `.${t}`).join(',');
  }

  onFileSelected(event: Event, indicatorId: number) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadErrors[indicatorId] = '';
    this.uploadingFor = indicatorId;

    const formData = new FormData();
    formData.append('file', file);

    // Si tienes report_id disponible como @Input, agrégalo aquí:
    // formData.append('report_id', String(this.reportId));

    this.http.post<any>(`${environment.apiUrl}/files/upload`, formData).subscribe({
      next: (result) => {
        this.uploadingFor = null;
        this.setValue(indicatorId, result);
        // Limpiar el input para permitir volver a seleccionar el mismo archivo
        input.value = '';
      },
      error: (err) => {
        this.uploadingFor = null;
        this.uploadErrors[indicatorId] = err.error?.errors?.file || 'Error al subir el archivo';
        input.value = '';
      }
    });
  }

  removeFile(indicatorId: number) {
    this.setValue(indicatorId, null);
    this.uploadErrors[indicatorId] = '';
  }

}
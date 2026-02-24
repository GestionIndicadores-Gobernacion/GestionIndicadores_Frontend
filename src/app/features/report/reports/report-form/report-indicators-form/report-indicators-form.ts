import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../core/models/component.model';
import { HttpClient } from '@angular/common/http';
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

  uploadingFor: number | null = null;
  uploadErrors: Record<number, string> = {};

  constructor(private http: HttpClient) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['indicators'] || changes['values']) {
      this.initializeGroupedDataIndicators();
      this.initializeCategorizedGroupIndicators();
    }
  }

  // =========================
  // INITIALIZE GROUPED DATA
  // =========================

  private initializeGroupedDataIndicators(): void {
    this.indicators.forEach(ind => {
      if (ind.field_type !== 'grouped_data') return;
      const selectedGroups = this.getSelectedOptionsForGroupedData(ind);
      if (!this.values[ind.id!]) this.values[ind.id!] = {};

      selectedGroups.forEach(groupKey => {
        if (!this.values[ind.id!][groupKey]) this.values[ind.id!][groupKey] = {};
        ind.config?.sub_fields?.forEach((subField: any) => {
          if (!(subField.name in this.values[ind.id!][groupKey])) {
            this.values[ind.id!][groupKey][subField.name] = subField.type === 'number' ? 0 : '';
          }
        });
      });

      if (selectedGroups.length > 0) {
        Object.keys(this.values[ind.id!] || {}).forEach(groupKey => {
          if (!selectedGroups.includes(groupKey)) delete this.values[ind.id!][groupKey];
        });
      }
    });
  }

  // =========================
  // INITIALIZE CATEGORIZED_GROUP
  // sub_sections[sectionKey][category][metricKey] = number
  // El máximo de cada valor es la suma de esa métrica en esa categoría
  // =========================

  private initializeCategorizedGroupIndicators(): void {
    this.indicators.forEach(ind => {
      if (ind.field_type !== 'categorized_group') return;

      if (!this.values[ind.id!]) {
        this.values[ind.id!] = { selected_categories: [], data: {}, sub_sections: {} };
      }

      const val = this.values[ind.id!];
      if (!val.selected_categories) val.selected_categories = [];
      if (!val.data) val.data = {};
      if (!val.sub_sections) val.sub_sections = {};

      const subSections: any[] = ind.config?.sub_sections || [];
      const metrics: any[] = ind.config?.metrics || [];
      const groups: string[] = ind.config?.groups || [];

      // Inicializar data
      val.selected_categories.forEach((cat: string) => {
        if (!val.data[cat]) val.data[cat] = {};
        groups.forEach((group: string) => {
          if (!val.data[cat][group]) val.data[cat][group] = {};
          metrics.forEach((metric: any) => {
            if (!(metric.key in val.data[cat][group])) val.data[cat][group][metric.key] = 0;
          });
        });
      });

      // Limpiar categorías no seleccionadas de data
      Object.keys(val.data).forEach(cat => {
        if (!val.selected_categories.includes(cat)) delete val.data[cat];
      });

      // Inicializar sub_sections: [sectionKey][category][metricKey]
      subSections.forEach((section: any) => {
        if (!val.sub_sections[section.key]) val.sub_sections[section.key] = {};

        val.selected_categories.forEach((cat: string) => {
          if (!val.sub_sections[section.key][cat]) val.sub_sections[section.key][cat] = {};
          metrics.forEach((metric: any) => {
            if (!(metric.key in val.sub_sections[section.key][cat])) {
              val.sub_sections[section.key][cat][metric.key] = 0;
            }
          });
        });

        // Limpiar categorías no seleccionadas de sub_sections
        Object.keys(val.sub_sections[section.key]).forEach(cat => {
          if (!val.selected_categories.includes(cat)) delete val.sub_sections[section.key][cat];
        });
      });
    });
  }

  // =========================
  // CATEGORIZED_GROUP: TOGGLE CATEGORY
  // =========================

  toggleCategory(indicatorId: number, category: string): void {
    const val = this.values[indicatorId];
    const ind = this.indicators.find(i => i.id === indicatorId)!;
    const idx = val.selected_categories.indexOf(category);
    const metrics: any[] = ind.config?.metrics || [];
    const groups: string[] = ind.config?.groups || [];
    const subSections: any[] = ind.config?.sub_sections || [];

    if (idx > -1) {
      val.selected_categories.splice(idx, 1);
      delete val.data[category];
      subSections.forEach((section: any) => {
        if (val.sub_sections[section.key]) delete val.sub_sections[section.key][category];
      });
    } else {
      val.selected_categories.push(category);

      // Inicializar data para la categoría
      val.data[category] = {};
      groups.forEach((group: string) => {
        val.data[category][group] = {};
        metrics.forEach((metric: any) => { val.data[category][group][metric.key] = 0; });
      });

      // Inicializar sub_sections para la categoría
      subSections.forEach((section: any) => {
        if (!val.sub_sections[section.key]) val.sub_sections[section.key] = {};
        val.sub_sections[section.key][category] = {};
        metrics.forEach((metric: any) => { val.sub_sections[section.key][category][metric.key] = 0; });
      });
    }

    this.values = { ...this.values };
    this.emit();
  }

  isCategorySelected(indicatorId: number, category: string): boolean {
    return this.values[indicatorId]?.selected_categories?.includes(category) || false;
  }

  getSelectedCategories(indicatorId: number): string[] {
    return this.values[indicatorId]?.selected_categories || [];
  }

  // =========================
  // CATEGORIZED_GROUP: METRIC VALUE
  // =========================

  getCategorizedMetricValue(indicatorId: number, category: string, group: string, metricKey: string): number {
    return this.values[indicatorId]?.data?.[category]?.[group]?.[metricKey] ?? 0;
  }

  setCategorizedMetricValue(indicatorId: number, category: string, group: string, metricKey: string, value: any): void {
    const num = value !== '' && value !== null && value !== undefined ? Number(value) : 0;
    this.values[indicatorId].data[category][group][metricKey] = isNaN(num) ? 0 : num;
    this.values = { ...this.values };
    this.emit();
  }

  // =========================
  // CATEGORIZED_GROUP: SUB_SECTIONS
  // sub_sections[sectionKey][category][metricKey]
  // =========================

  getSubSectionValue(indicatorId: number, sectionKey: string, category: string, metricKey: string): number {
    return this.values[indicatorId]?.sub_sections?.[sectionKey]?.[category]?.[metricKey] ?? 0;
  }

  setSubSectionValue(indicatorId: number, sectionKey: string, category: string, metricKey: string, value: any): void {
    const num = value !== '' && value !== null && value !== undefined ? Number(value) : 0;
    if (!this.values[indicatorId].sub_sections[sectionKey]) this.values[indicatorId].sub_sections[sectionKey] = {};
    if (!this.values[indicatorId].sub_sections[sectionKey][category]) this.values[indicatorId].sub_sections[sectionKey][category] = {};
    this.values[indicatorId].sub_sections[sectionKey][category][metricKey] = isNaN(num) ? 0 : num;
    this.values = { ...this.values };
    this.emit();
  }

  // =========================
  // CATEGORIZED_GROUP: TOTALS
  // =========================

  /** Suma de una métrica en todos los grupos de UNA categoría */
  getCategoryMetricTotal(indicatorId: number, category: string, metricKey: string): number {
    const data = this.values[indicatorId]?.data?.[category];
    if (!data) return 0;
    return Object.values(data).reduce((sum: number, groupData: any) => sum + (Number(groupData?.[metricKey]) || 0), 0);
  }

  /** Suma de TODAS las métricas en UNA categoría (para el header del bloque) */
  getCategoryAllMetricsTotal(indicatorId: number, category: string): number {
    const ind = this.indicators.find(i => i.id === indicatorId);
    if (!ind) return 0;
    return (ind.config?.metrics || []).reduce((sum: number, m: any) => {
      return sum + this.getCategoryMetricTotal(indicatorId, category, m.key);
    }, 0);
  }

  /** Suma de una métrica en TODAS las categorías */
  getMetricGrandTotal(indicatorId: number, metricKey: string): number {
    const data = this.values[indicatorId]?.data || {};
    let total = 0;
    Object.values(data).forEach((categoryData: any) => {
      Object.values(categoryData).forEach((groupData: any) => { total += Number(groupData?.[metricKey]) || 0; });
    });
    return total;
  }

  getCategorizedGrandTotal(indicatorId: number): number {
    const ind = this.indicators.find(i => i.id === indicatorId);
    if (!ind) return 0;
    return (ind.config?.metrics || []).reduce((sum: number, m: any) => sum + this.getMetricGrandTotal(indicatorId, m.key), 0);
  }

  /** Valida que sub_section[category][metric] no supere el total de esa métrica en esa categoría */
  isSubSectionOverLimit(indicatorId: number, sectionKey: string, category: string, metricKey: string): boolean {
    const ind = this.indicators.find(i => i.id === indicatorId);
    const section = ind?.config?.sub_sections?.find((s: any) => s.key === sectionKey);
    if (section?.max_source !== 'metrics_total') return false;
    return this.getSubSectionValue(indicatorId, sectionKey, category, metricKey) > this.getCategoryMetricTotal(indicatorId, category, metricKey);
  }

  // =========================
  // VALUE SETTERS
  // =========================

  setValue(indicatorId: number, value: any) {
    this.values[indicatorId] = value;
    this.initializeGroupedDataIndicators();
    this.emit();
  }

  setSumValue(indicatorId: number, field: string, value: any) {
    if (!this.values[indicatorId]) this.values[indicatorId] = {};
    const numValue = Number(value);
    this.values[indicatorId][field] = (!isNaN(numValue) && value !== '' && value !== null) ? numValue : 0;
    this.emit();
  }

  // =========================
  // MULTI-SELECT
  // =========================

  toggleMultiSelectOption(indicatorId: number, option: string) {
    if (!this.values[indicatorId]) this.values[indicatorId] = [];
    const index = this.values[indicatorId].indexOf(option);
    if (index > -1) { this.values[indicatorId].splice(index, 1); } else { this.values[indicatorId].push(option); }
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
      const numValue = Number(value);
      parsedValue = (value !== null && value !== undefined && value !== '' && !isNaN(numValue)) ? numValue : 0;
    } else {
      parsedValue = value ? String(value) : '';
    }
    this.values = {
      ...this.values,
      [indicatorId]: { ...this.values[indicatorId], [groupKey]: { ...(this.values[indicatorId]?.[groupKey] || {}), [fieldName]: parsedValue } }
    };
    this.emit();
  }

  getGroupedValue(indicatorId: number, groupKey: string, fieldName: string): any {
    const value = this.values[indicatorId]?.[groupKey]?.[fieldName];
    const subField = this.getSubFieldConfig(indicatorId, fieldName);
    if (subField?.type === 'number') return value ?? 0;
    return value ?? '';
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

  getSumTotal(indicatorId: number): number {
    const obj = this.values[indicatorId];
    if (!obj) return 0;
    return Object.values(obj).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }

  getTarget(ind: ComponentIndicatorModel): number | null {
    if (!['number', 'sum_group', 'grouped_data', 'categorized_group'].includes(ind.field_type)) return null;
    if (!this.reportDate || !ind.targets?.length) return null;
    const year = new Date(this.reportDate).getFullYear();
    const t = ind.targets.find(t => t.year === year);
    return t ? t.target_value : null;
  }

  emit() { this.valuesChange.emit({ ...this.values }); }
  getIndicatorId(ind: ComponentIndicatorModel): number { return ind.id!; }

  // =========================
  // VALIDATION
  // =========================

  isIndicatorValid(ind: ComponentIndicatorModel): boolean {
    if (!ind.is_required) return true;
    const value = this.values[ind.id!];
    switch (ind.field_type) {
      case 'select':            return value !== null && value !== undefined && value !== '';
      case 'multi_select':      return Array.isArray(value) && value.length > 0;
      case 'number':            return value !== null && value !== undefined && value !== '';
      case 'text':              return value !== null && value !== undefined && value.trim() !== '';
      case 'sum_group':         return !!value && typeof value === 'object' && Object.values(value).some(v => Number(v) > 0);
      case 'grouped_data':      return !!value && typeof value === 'object' && Object.keys(value).length > 0;
      case 'file_attachment':   return !!value?.file_url;
      case 'categorized_group': return Array.isArray(value?.selected_categories) && value.selected_categories.length > 0;
      default:                  return true;
    }
  }

  getGroupedTotal(indicatorId: number, groupKey: string, subFields: any[]): number {
    const groupData = this.values[indicatorId]?.[groupKey];
    if (!groupData) return 0;
    return subFields.filter(sf => sf.type === 'number').reduce((total, sf) => {
      const v = groupData[sf.name];
      return total + (v && !isNaN(v) ? Number(v) : 0);
    }, 0);
  }

  getGroupedGrandTotal(indicatorId: number, subFields: any[]): number {
    const allGroups = this.values[indicatorId];
    if (!allGroups || typeof allGroups !== 'object') return 0;
    return Object.keys(allGroups).reduce((total, groupKey) => total + this.getGroupedTotal(indicatorId, groupKey, subFields), 0);
  }

  // =========================
  // FILE ATTACHMENT
  // =========================

  getFileValue(indicatorId: number): { file_name: string; file_url: string; file_size_mb: number } | null {
    const val = this.values[indicatorId];
    return (val && typeof val === 'object' && val.file_url) ? val : null;
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
    this.http.post<any>(`${environment.apiUrl}/files/upload`, formData).subscribe({
      next: (result) => { this.uploadingFor = null; this.setValue(indicatorId, result); input.value = ''; },
      error: (err) => { this.uploadingFor = null; this.uploadErrors[indicatorId] = err.error?.errors?.file || 'Error al subir el archivo'; input.value = ''; }
    });
  }

  removeFile(indicatorId: number) {
    this.setValue(indicatorId, null);
    this.uploadErrors[indicatorId] = '';
  }
}
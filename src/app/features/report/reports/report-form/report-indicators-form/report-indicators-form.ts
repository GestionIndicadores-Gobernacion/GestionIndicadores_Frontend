import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../core/models/component.model';

@Component({
  selector: 'app-report-indicators-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-indicators-form.html'
})
export class ReportIndicatorsFormComponent {

  @Input() indicators: ComponentIndicatorModel[] = [];
  @Input() reportDate!: string;

  @Input() values: Record<number, any> = {};
  @Output() valuesChange = new EventEmitter<Record<number, any>>();

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
    this.values[indicatorId][field] = Number(value);
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
    this.values[indicatorId][groupKey][fieldName] = subField?.type === 'number' ? Number(value) : value;
    this.emit();
  }

  getGroupedValue(indicatorId: number, groupKey: string, fieldName: string): any {
    return this.values[indicatorId]?.[groupKey]?.[fieldName] || '';
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
}
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

  getSumTotal(indicatorId: number): number {
    const obj = this.values[indicatorId];
    if (!obj) return 0;
    return Object.values(obj).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }

  // =========================
  // META (para NUMBER y SUM_GROUP)
  // =========================

  getTarget(ind: ComponentIndicatorModel): number | null {
    // Solo mostrar metas para number y sum_group
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

  // Helper para obtener ID seguro
  getIndicatorId(ind: ComponentIndicatorModel): number {
    return ind.id!; // Non-null assertion
  }
}
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Dataset } from '../../../../../core/models/dataset.model';
import { DatasetService } from '../../../../../core/services/datasets.service';
import {
  MetricType,
  MetricTypeMeta,
  METRIC_TYPE_META,
  TYPES_WITH_FIELD_NAME,
  TYPES_WITH_DATASET,
  TYPES_WITH_MANUAL_VALUE
} from './metric-type.config';

@Component({
  selector: 'app-strategy-metrics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './strategy-metrics.html',
  styleUrl: './strategy-metrics.css',
})
export class StrategyMetricsComponent implements OnInit {

  @Input() metrics!: FormArray;
  @Input() components: { id: number; name: string }[] = [];

  datasets: Dataset[] = [];

  readonly metricTypes = Object.entries(METRIC_TYPE_META) as [MetricType, MetricTypeMeta][];

  // Años disponibles para métricas manuales (2024 en adelante hasta año actual)
  readonly availableYears: number[] = (() => {
    const years: number[] = [];
    const current = new Date().getFullYear();
    for (let y = 2024; y <= current; y++) years.push(y);
    return years;
  })();

  constructor(
    private fb: FormBuilder,
    private datasetService: DatasetService
  ) { }

  ngOnInit(): void {
    this.datasetService.getAll().subscribe({
      next: (data) => this.datasets = data ?? []
    });
  }

  get metricGroups(): FormGroup[] {
    return this.metrics.controls as FormGroup[];
  }

  private getType(metric: FormGroup): MetricType {
    return metric.get('metric_type')?.value as MetricType;
  }

  private getMeta(metric: FormGroup): MetricTypeMeta {
    return METRIC_TYPE_META[this.getType(metric)] ?? {
      label: '—', shortLabel: '—', hint: '', badgeClass: 'bg-gray-100 text-gray-600'
    };
  }

  getSteps(metric: FormGroup): string[] {
    return this.getMeta(metric).steps ?? [];
  }

  addMetric(): void {
    this.metrics.push(
      this.fb.group({
        description: ['', Validators.required],
        metric_type: ['report_count', Validators.required],
        component_id: [null],
        field_name: [''],
        dataset_id: [null],
        manual_value: [null],
        year: [null],   // ← nuevo
      })
    );
  }

  removeMetric(index: number): void {
    this.metrics.removeAt(index);
  }

  showFieldName(metric: FormGroup): boolean {
    return TYPES_WITH_FIELD_NAME.includes(this.getType(metric));
  }

  showDataset(metric: FormGroup): boolean {
    return TYPES_WITH_DATASET.includes(this.getType(metric));
  }

  showManualValue(metric: FormGroup): boolean {
    return TYPES_WITH_MANUAL_VALUE.includes(this.getType(metric));
  }

  getTypeHint(metric: FormGroup): string { return this.getMeta(metric).hint; }
  getTypeLabel(metric: FormGroup): string { return this.getMeta(metric).shortLabel; }
  getTypeBadgeClass(metric: FormGroup): string { return this.getMeta(metric).badgeClass; }

  getFieldNameLabel(metric: FormGroup): string {
    const t = this.getType(metric);
    if (t === 'dataset_sum') return 'Columna en el dataset';
    if (t === 'report_sum') return 'ID del indicador';
    if (t === 'report_sum_nested') return 'ID del indicador';
    return 'Campo en el reporte';
  }

  getFieldNamePlaceholder(metric: FormGroup): string {
    const t = this.getType(metric);
    if (t === 'dataset_sum') return 'ej: personas_capacitadas';
    if (t === 'report_sum') return 'ej: 137';
    if (t === 'report_sum_nested') return 'ej: 99';
    return 'ej: cantidad_beneficiarios';
  }

  getFieldNameHint(metric: FormGroup): string {
    const t = this.getType(metric);
    if (t === 'dataset_sum') return 'Nombre exacto de la columna en el archivo cargado';
    if (t === 'report_sum') return 'ID del indicador numérico a sumar';
    if (t === 'report_sum_nested') return 'ID del indicador con estructura JSON anidada';
    return 'Nombre del atributo numérico en el modelo de reporte';
  }

  getTypesSummary(): { label: string; count: number; class: string }[] {
    const counts: Partial<Record<MetricType, number>> = {};
    for (const m of this.metricGroups) {
      const t = this.getType(m);
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return (Object.entries(counts) as [MetricType, number][]).map(([type, count]) => ({
      label: METRIC_TYPE_META[type].shortLabel,
      count,
      class: METRIC_TYPE_META[type].badgeClass,
    }));
  }
}
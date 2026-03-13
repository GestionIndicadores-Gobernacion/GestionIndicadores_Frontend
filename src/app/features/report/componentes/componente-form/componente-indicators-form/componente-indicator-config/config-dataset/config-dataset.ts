import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatasetService } from '../../../../../../../core/services/datasets.service';

@Component({
  selector: 'app-config-dataset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-dataset.html'
})
export class ConfigDatasetComponent implements OnInit, OnChanges {
  @Input() indicatorGroup!: FormGroup;
  @Input() isMulti = false;

  // Lista de indicadores del componente (para el selector show_if)
  @Input() allIndicatorControls: any[] = [];

  allDatasets: any[] = [];
  loading = false;
  error = '';

  // Opciones de indicadores tipo select disponibles para show_if
  selectIndicators: { name: string }[] = [];

  constructor(private datasetService: DatasetService) { }

  ngOnInit(): void {

    if (!this.indicatorGroup.get('configShowIfIndicatorName')) {
      this.indicatorGroup.addControl('configShowIfIndicatorName', new FormControl(null));
    }

    if (!this.indicatorGroup.get('configShowIfValue')) {
      this.indicatorGroup.addControl('configShowIfValue', new FormControl(null));
    }

    this.loading = true;
    this.datasetService.getAll().subscribe({
      next: (datasets) => { this.allDatasets = datasets; this.loading = false; },
      error: () => { this.error = 'Error al cargar datasets'; this.loading = false; }
    });

    this.refreshSelectIndicators();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allIndicatorControls'] || changes['indicatorGroup']) {
      setTimeout(() => this.refreshSelectIndicators());
    }
  }

  private refreshSelectIndicators(): void {
    const currentName = this.indicatorGroup.get('name')?.value;

    this.selectIndicators = (this.allIndicatorControls || [])
      .filter(ctrl =>
        ctrl.get('field_type')?.value === 'select' &&
        ctrl.get('name')?.value !== currentName
      )
      .map(ctrl => ({ name: ctrl.get('name')?.value }))
      .filter(ind => ind.name);
  }

  get selectedDatasetId(): number | null {
    return this.indicatorGroup.get('configDatasetId')?.value || null;
  }

  get selectedDatasetName(): string {
    return this.allDatasets.find(d => d.id === this.selectedDatasetId)?.name || '';
  }

  // ── show_if helpers ───────────────────────────────────────────

  get showIfIndicatorName(): string {
    return this.indicatorGroup.get('configShowIfIndicatorName')?.value || '';
  }

  get showIfValue(): string {
    return this.indicatorGroup.get('configShowIfValue')?.value || '';
  }

  /** Opciones del indicador select elegido como padre */
  get parentIndicatorOptions(): string[] {
    const parentName = this.showIfIndicatorName;
    if (!parentName) return [];
    const parentCtrl = (this.allIndicatorControls || []).find(
      ctrl => ctrl.get('name')?.value === parentName
    );
    if (!parentCtrl) return [];
    const raw: string = parentCtrl.get('configOptions')?.value || '';
    return raw.split('\n').map((o: string) => o.trim()).filter((o: string) => o.length > 0);
  }

  clearShowIf(): void {
    this.indicatorGroup.get('configShowIfIndicatorName')?.setValue(null);
    this.indicatorGroup.get('configShowIfValue')?.setValue(null);
  }
}
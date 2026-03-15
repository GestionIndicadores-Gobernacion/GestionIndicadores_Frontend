import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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

  // indicadores del componente (para show_if)
  @Input() allIndicatorControls: any[] = [];

  // columnas del dataset seleccionado
  datasetFields: string[] = [];

  // datasets disponibles
  allDatasets: any[] = [];
  loading = false;
  error = '';

  // indicadores tipo select disponibles para show_if
  selectIndicators: { name: string }[] = [];

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────

  ngOnInit(): void {

    this.loading = true;

    // cargar datasets
    this.datasetService.getAll().subscribe({
      next: (datasets) => {
        this.allDatasets = datasets;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar datasets';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    // escuchar cambio de dataset
    this.indicatorGroup.get('configDatasetId')?.valueChanges.subscribe(id => {
      this.loadDatasetFields(id);
    });

    // cargar columnas si se está editando un indicador
    const datasetId = this.indicatorGroup.get('configDatasetId')?.value;
    if (datasetId) {
      this.loadDatasetFields(datasetId);
    }

    this.refreshSelectIndicators();
  }

  // ─────────────────────────────────────────────
  // CHANGES
  // ─────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allIndicatorControls'] || changes['indicatorGroup']) {
      setTimeout(() => this.refreshSelectIndicators());
    }
  }

  // ─────────────────────────────────────────────
  // DATASET FIELDS
  // ─────────────────────────────────────────────

  private loadDatasetFields(datasetId: number): void {

    if (!datasetId) {
      this.datasetFields = [];
      return;
    }

    this.datasetService.getRecordsByDataset(datasetId).subscribe({
      next: records => {

        if (records?.length) {
          this.datasetFields = Object.keys(records[0].data || {});
        } else {
          this.datasetFields = [];
        }

        // 🔥 restaurar valor guardado al editar
        const saved = this.indicatorGroup.get('configLabelField')?.value;

        if (saved && this.datasetFields.includes(saved)) {
          this.indicatorGroup.get('configLabelField')?.setValue(saved, { emitEvent: false });
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.datasetFields = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ─────────────────────────────────────────────
  // SHOW_IF
  // ─────────────────────────────────────────────

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

  get showIfIndicatorName(): string {
    return this.indicatorGroup.get('configShowIfIndicatorName')?.value || '';
  }

  get showIfValue(): string {
    return this.indicatorGroup.get('configShowIfValue')?.value || '';
  }

  get parentIndicatorOptions(): string[] {

    const parentName = this.showIfIndicatorName;
    if (!parentName) return [];

    const parentCtrl = (this.allIndicatorControls || []).find(
      ctrl => ctrl.get('name')?.value === parentName
    );

    if (!parentCtrl) return [];

    const raw: string = parentCtrl.get('configOptions')?.value || '';

    return raw
      .split('\n')
      .map((o: string) => o.trim())
      .filter((o: string) => o.length > 0);
  }

  clearShowIf(): void {
    this.indicatorGroup.get('configShowIfIndicatorName')?.setValue(null);
    this.indicatorGroup.get('configShowIfValue')?.setValue(null);
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  get selectedDatasetId(): number | null {
    return this.indicatorGroup.get('configDatasetId')?.value || null;
  }

  get selectedDatasetName(): string {
    return this.allDatasets.find(d => d.id === this.selectedDatasetId)?.name || '';
  }

}
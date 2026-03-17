import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ComponentIndicatorModel } from '../../../../../core/models/component.model';
import { initializeCategorizedGroup, sanitizeEmit } from './helpers/report-indicators.helpers';
import { DatasetMultiSelectFieldComponent } from './dataset-fields/dataset-multi-select-field/dataset-multi-select-field';
import { DatasetSelectFieldComponent } from './dataset-fields/dataset-select-field/dataset-select-field';
import { IndicatorDatasetService } from './indicator-dataset.service';
import { IndicatorFileService } from './indicator-file.service';
import { IndicatorGroupService } from './indicator-group.service';
import { CategorizedGroupFieldComponent } from './report-simple-fields/categorized-group-field/categorized-group-field';
import { FileAttachmentFieldComponent } from './report-simple-fields/file-attachment-field/file-attachment-field';
import { GroupedDataFieldComponent } from './report-simple-fields/grouped-data-field/grouped-data-field';
import { MultiSelectFieldComponent } from './report-simple-fields/multi-select-field/multi-select-field';
import { NumberFieldComponent } from './report-simple-fields/number-field/number-field';
import { SelectFieldComponent } from './report-simple-fields/select-field/select-field';
import { SumGroupFieldComponent } from './report-simple-fields/sum-group-field/sum-group-field';
import { TextFieldComponent } from './report-simple-fields/text-field/text-field';
import { ShowIfService } from './show-if.service';
import { RedAnimaliaModalComponent } from './red-animalia-modal/red-animalia-modal';


@Component({
  selector: 'app-report-indicators-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NumberFieldComponent,
    TextFieldComponent,
    SelectFieldComponent,
    MultiSelectFieldComponent,
    SumGroupFieldComponent,
    DatasetSelectFieldComponent,
    DatasetMultiSelectFieldComponent,
    FileAttachmentFieldComponent,
    GroupedDataFieldComponent,
    CategorizedGroupFieldComponent,
    RedAnimaliaModalComponent
  ],
  templateUrl: './report-indicators-form.html'
})
export class ReportIndicatorsFormComponent implements OnChanges {

  @Input() indicators: ComponentIndicatorModel[] = [];
  @Input() reportDate: string | null = null;
  @Input() values: Record<number, any> = {};
  @Input() interventionLocation: string | null = null;
  @Output() valuesChange = new EventEmitter<Record<number, any>>();

  selectedGroupMode: Record<string, number | null> = {};
  datasetOptions: Record<number, { id: number; label: string }[]> = {};
  datasetLoading: Record<number, boolean> = {};
  datasetError: Record<number, string> = {};

  openRedAnimaliaModalId: number | null = null;


  constructor(
    private groupSvc: IndicatorGroupService,
    private showIfSvc: ShowIfService,
    private datasetSvc: IndicatorDatasetService,
    public fileSvc: IndicatorFileService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(changes: SimpleChanges): void {

    const indicatorsChanged = !!changes['indicators'];
    const valuesFirstLoad = !!changes['values']?.firstChange;
    const locationChanged = !!changes['interventionLocation'];

    if (indicatorsChanged || valuesFirstLoad) {

      this.groupSvc.initGroupModes(this.indicators, this.values, this.selectedGroupMode);
      this.initializeComplexFields();

      this.datasetSvc.loadOptions(
        this.indicators,
        this.datasetOptions,
        this.datasetLoading,
        this.datasetError,
        this.cdr,
        this.interventionLocation   // 👈 NUEVO
      );

    }

    if (locationChanged) {

      this.datasetSvc.loadOptions(
        this.indicators,
        this.datasetOptions,
        this.datasetLoading,
        this.datasetError,
        this.cdr,
        this.interventionLocation   // 👈 recargar si cambia municipio
      );

    }

  }

  // ── Computed ─────────────────────────────────────────────────

  getGroups(): Record<string, ComponentIndicatorModel[]> {
    return this.groupSvc.getGroups(this.indicators);
  }

  get activeIndicators(): ComponentIndicatorModel[] {
    return this.groupSvc.getActiveIndicators(
      this.indicators,
      this.selectedGroupMode,
      ind => this.showIfSvc.isVisible(ind, this.indicators, this.values)
    );
  }

  // ── Grupos mutuamente excluyentes ─────────────────────────────

  selectGroupMode(groupName: string, indicatorId: number): void {
    const previous = this.selectedGroupMode[groupName];
    if (previous != null && previous !== indicatorId) delete this.values[previous];
    this.selectedGroupMode[groupName] = indicatorId;
    this.values = { ...this.values };
    this.initializeComplexFields();
    this.cdr.detectChanges();
    this.emit();
  }

  // ── Inicialización de campos complejos ────────────────────────

  private initializeComplexFields(): void {
    this.activeIndicators.forEach(ind => {
      if (ind.field_type === 'grouped_data') this.initGroupedData(ind);
      if (ind.field_type === 'categorized_group') this.initCategorizedGroup(ind);
    });
  }

  private initGroupedData(ind: ComponentIndicatorModel): void {
    const selectedGroups = this.getSelectedGroupsFor(ind);
    if (!this.values[ind.id!]) this.values[ind.id!] = {};
    selectedGroups.forEach(groupKey => {
      if (!this.values[ind.id!][groupKey]) this.values[ind.id!][groupKey] = {};
      ind.config?.sub_fields?.forEach((sf: any) => {
        if (!(sf.name in this.values[ind.id!][groupKey])) {
          this.values[ind.id!][groupKey][sf.name] = sf.type === 'number' ? 0 : '';
        }
      });
    });
    Object.keys(this.values[ind.id!] || {}).forEach(groupKey => {
      if (!selectedGroups.includes(groupKey)) delete this.values[ind.id!][groupKey];
    });
  }

  private initCategorizedGroup(ind: ComponentIndicatorModel): void {
    if (!this.values[ind.id!]) {
      this.values[ind.id!] = { selected_categories: [], data: {}, sub_sections: {} };
    }
    initializeCategorizedGroup(this.values[ind.id!], ind);
  }

  // ── Value handlers (delegados a los sub-componentes vía ngModel) ──

  onValueChange(indicatorId: number, value: any): void {
    const ind = this.indicators.find(i => i.id === indicatorId);
    this.values[indicatorId] = value;
    if (ind?.field_type === 'multi_select') this.initializeComplexFields();
    this.showIfSvc.clearInactiveValues(
      this.indicators,
      this.values,
      i => this.showIfSvc.isVisible(i, this.indicators, this.values)
    );
    this.values = { ...this.values };
    this.cdr.detectChanges();
    this.emit();
  }

  // ── File upload ───────────────────────────────────────────────

  onFileSelected(event: Event, indicatorId: number): void {
    this.fileSvc.upload(
      event,
      indicatorId,
      result => this.onValueChange(indicatorId, result),
      msg => { this.fileSvc.errors[indicatorId] = msg; }
    );
  }

  // ── Dataset helpers (pasados como @Input a sub-componentes) ───

  getDatasetOptions(indicatorId: number) { return this.datasetOptions[indicatorId] || []; }

  // ── Grouped data helper ───────────────────────────────────────

  getSelectedGroupsFor(ind: ComponentIndicatorModel): string[] {
    if (!ind.config?.parent_field) return [];
    const parent = this.indicators.find(i => i.name === ind.config?.parent_field);
    if (!parent) return [];
    return this.values[parent.id!] || [];
  }

  // ── Target ───────────────────────────────────────────────────

  getTarget(ind: ComponentIndicatorModel): number | null {
    if (!['number', 'sum_group', 'grouped_data', 'categorized_group'].includes(ind.field_type)) return null;
    if (!this.reportDate || !ind.targets?.length) return null;
    const year = new Date(this.reportDate).getFullYear();
    return ind.targets.find(t => t.year === year)?.target_value ?? null;
  }

  // ── Validation ────────────────────────────────────────────────

  isIndicatorValid(ind: ComponentIndicatorModel): boolean {
    if (!this.showIfSvc.isVisible(ind, this.indicators, this.values)) return true;
    if (!ind.is_required) return true;
    const value = this.values[ind.id!];
    switch (ind.field_type) {
      case 'select': return value != null && value !== '';
      case 'multi_select': return Array.isArray(value) && value.length > 0;
      case 'number': return value != null && value !== '';
      case 'text': return value != null && value.trim() !== '';
      case 'sum_group': return !!value && Object.values(value).some(v => Number(v) > 0);
      case 'grouped_data': return !!value && Object.keys(value).length > 0;
      case 'file_attachment': return !!value?.file_url;
      case 'categorized_group': return Array.isArray(value?.selected_categories) && value.selected_categories.length > 0;
      case 'dataset_select': return value != null;
      case 'dataset_multi_select': return Array.isArray(value) && value.length > 0;
      default: return true;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  getAcceptString(ind: ComponentIndicatorModel): string {
    const types: string[] = ind.config?.allowed_types;
    return types?.length ? types.map(t => `.${t}`).join(',') : '*/*';
  }

  getActiveIndicatorIds(): Set<number> {
    return new Set(this.activeIndicators.map(i => i.id!));
  }

  getIndicatorId(ind: ComponentIndicatorModel): number { return ind.id!; }

  emit(): void {
    this.valuesChange.emit(sanitizeEmit(this.values, this.activeIndicators));
  }

  openRedAnimaliaModal(indicatorId: number): void {
    this.openRedAnimaliaModalId = indicatorId;
  }

  closeRedAnimaliaModal(): void {
    this.openRedAnimaliaModalId = null;
  }

}
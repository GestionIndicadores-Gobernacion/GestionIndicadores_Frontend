import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { ComponentIndicatorModel } from '../../../../../core/models/component.model';
import { DatasetService } from '../../../../../core/services/datasets.service';
import { environment } from '../../../../../../environments/environment.prod';
import { initializeCategorizedGroup, toNumber, getCategoryMetricTotal, getCategorizedGrandTotal, sanitizeEmit } from './helpers/report-indicators.helpers';
import { RedAnimaliaModalComponent, RedAnimaliaResult } from './red-animalia-modal/red-animalia-modal';

@Component({
  selector: 'app-report-indicators-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RedAnimaliaModalComponent],
  templateUrl: './report-indicators-form.html'
})
export class ReportIndicatorsFormComponent implements OnChanges {

  @Input() indicators: ComponentIndicatorModel[] = [];
  @Input() reportDate: string | null = null;
  @Input() values: Record<number, any> = {};
  @Input() interventionLocation: string | null = null;
  @Output() valuesChange = new EventEmitter<Record<number, any>>();

  uploadingFor: number | null = null;
  uploadErrors: Record<number, string> = {};
  datasetOptions: Record<number, { id: number; label: string }[]> = {};
  datasetLoading: Record<number, boolean> = {};
  datasetError: Record<number, string> = {};
  selectedGroupMode: Record<string, number | null> = {};

  // Red Animalia
  redAnimaliaOpen = false;
  redAnimaliaIndicator: ComponentIndicatorModel | null = null;

  constructor(
    private http: HttpClient,
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    const indicatorsChanged = !!changes['indicators'];
    // Solo inicializar values en el primer cambio (carga inicial desde el servidor)
    // Los cambios posteriores de values son emits internos del propio componente
    const valuesFirstLoad = !!changes['values']?.firstChange;

    if (indicatorsChanged || valuesFirstLoad) {
      this.initGroupModes();
      this.initializeGroupedDataIndicators();
      this.initializeCategorizedGroupIndicators();
      this.loadDatasetOptions();
    } else if (indicatorsChanged) {
      // Solo indicators cambió (nuevo componente cargado)
      this.initGroupModes();
      this.loadDatasetOptions();
    }
  }

  // ── GRUPOS MUTUAMENTE EXCLUYENTES ────────────────────────────

  getGroups(): Record<string, ComponentIndicatorModel[]> {
    const map: Record<string, ComponentIndicatorModel[]> = {};
    this.indicators.forEach(ind => {
      if (ind.group_name) {
        if (!map[ind.group_name]) map[ind.group_name] = [];
        map[ind.group_name].push(ind);
      }
    });
    return map;
  }

  get activeIndicators(): ComponentIndicatorModel[] {
    const groups = this.getGroups();
    return this.indicators.filter(ind =>
      !ind.group_name || this.selectedGroupMode[ind.group_name] === ind.id
    );
  }

  private initGroupModes(): void {
    const groups = this.getGroups();
    Object.keys(groups).forEach(groupName => {
      if (groupName in this.selectedGroupMode) return;
      const members = groups[groupName];
      const withValue = members.find(m => this.values[m.id!] != null);
      this.selectedGroupMode[groupName] = withValue?.id ?? members[0].id ?? null;
    });
  }

  selectGroupMode(groupName: string, indicatorId: number): void {
    const previous = this.selectedGroupMode[groupName];
    if (previous != null && previous !== indicatorId) delete this.values[previous];
    this.selectedGroupMode[groupName] = indicatorId;
    this.values = { ...this.values };
    this.initializeGroupedDataIndicators();
    this.initializeCategorizedGroupIndicators();
    this.cdr.detectChanges();
    this.emit();
  }

  // ── INICIALIZACIÓN ───────────────────────────────────────────

  private initializeGroupedDataIndicators(): void {
    this.activeIndicators.forEach(ind => {
      if (ind.field_type !== 'grouped_data') return;
      const selectedGroups = this.getSelectedOptionsForGroupedData(ind);
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
    });
  }

  private initializeCategorizedGroupIndicators(): void {
    this.activeIndicators.forEach(ind => {
      if (ind.field_type !== 'categorized_group') return;
      if (!this.values[ind.id!]) {
        this.values[ind.id!] = { selected_categories: [], data: {}, sub_sections: {} };
      }
      initializeCategorizedGroup(this.values[ind.id!], ind);
    });
  }

  // ── CATEGORIZED GROUP ────────────────────────────────────────

  toggleCategory(indicatorId: number, category: string): void {
    const val = this.values[indicatorId];
    const ind = this.indicators.find(i => i.id === indicatorId)!;
    const metrics: any[] = ind.config?.metrics || [];
    const groups: string[] = ind.config?.groups || [];
    const subSections: any[] = ind.config?.sub_sections || [];
    const idx = val.selected_categories.indexOf(category);

    if (idx > -1) {
      val.selected_categories.splice(idx, 1);
      delete val.data[category];
      subSections.forEach((s: any) => {
        if (s.key === 'red_animalia') return; // nunca tocar red_animalia desde toggleCategory
        if (val.sub_sections[s.key]) delete val.sub_sections[s.key][category];
      });
    } else {
      val.selected_categories.push(category);
      val.data[category] = {};
      groups.forEach(g => {
        val.data[category][g] = {};
        metrics.forEach(m => { val.data[category][g][m.key] = 0; });
      });
      subSections.forEach((s: any) => {
        if (s.key === 'red_animalia') return; // nunca tocar red_animalia desde toggleCategory
        if (!val.sub_sections[s.key]) val.sub_sections[s.key] = {};
        val.sub_sections[s.key][category] = {};
        metrics.forEach(m => { val.sub_sections[s.key][category][m.key] = 0; });
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

  getCategorizedMetricValue(indicatorId: number, category: string, group: string, metricKey: string): number {
    return this.values[indicatorId]?.data?.[category]?.[group]?.[metricKey] ?? 0;
  }

  setCategorizedMetricValue(indicatorId: number, category: string, group: string, metricKey: string, value: any): void {
    this.values[indicatorId].data[category][group][metricKey] = toNumber(value);
    this.values = { ...this.values };
    this.emit();
  }

  getSubSectionValue(indicatorId: number, sectionKey: string, category: string, metricKey: string): number {
    return this.values[indicatorId]?.sub_sections?.[sectionKey]?.[category]?.[metricKey] ?? 0;
  }

  setSubSectionValue(indicatorId: number, sectionKey: string, category: string, metricKey: string, value: any): void {
    const ss = this.values[indicatorId].sub_sections;
    if (!ss[sectionKey]) ss[sectionKey] = {};
    if (!ss[sectionKey][category]) ss[sectionKey][category] = {};
    ss[sectionKey][category][metricKey] = toNumber(value);
    this.values = { ...this.values };
    this.emit();
  }

  getCategoryMetricTotal(indicatorId: number, category: string, metricKey: string): number {
    return getCategoryMetricTotal(this.values, indicatorId, category, metricKey);
  }

  getCategoryAllMetricsTotal(indicatorId: number, category: string): number {
    const ind = this.indicators.find(i => i.id === indicatorId);
    if (!ind) return 0;
    return (ind.config?.metrics || []).reduce((sum: number, m: any) =>
      sum + getCategoryMetricTotal(this.values, indicatorId, category, m.key), 0);
  }

  getCategorizedGrandTotal(indicatorId: number): number {
    const ind = this.indicators.find(i => i.id === indicatorId);
    if (!ind) return 0;
    return getCategorizedGrandTotal(this.values, ind);
  }

  isSubSectionOverLimit(indicatorId: number, sectionKey: string, category: string, metricKey: string): boolean {
    const ind = this.indicators.find(i => i.id === indicatorId);
    const section = ind?.config?.sub_sections?.find((s: any) => s.key === sectionKey);
    if (section?.max_source !== 'metrics_total') return false;
    return this.getSubSectionValue(indicatorId, sectionKey, category, metricKey) >
      getCategoryMetricTotal(this.values, indicatorId, category, metricKey);
  }

  // ── VALUE SETTERS ─────────────────────────────────────────────

  setValue(indicatorId: number, value: any): void {
    const ind = this.indicators.find(i => i.id === indicatorId);
    this.values[indicatorId] = ind?.field_type === 'number' ? toNumber(value) : value;
    this.initializeGroupedDataIndicators();
    this.emit();
  }

  setSumValue(indicatorId: number, field: string, value: any): void {
    if (!this.values[indicatorId]) this.values[indicatorId] = {};
    this.values[indicatorId][field] = toNumber(value);
    this.emit();
  }

  getSumTotal(indicatorId: number): number {
    const obj = this.values[indicatorId];
    if (!obj) return 0;
    return Object.values(obj).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }

  // ── MULTI-SELECT ──────────────────────────────────────────────

  toggleMultiSelectOption(indicatorId: number, option: string): void {
    if (!this.values[indicatorId]) this.values[indicatorId] = [];
    const index = this.values[indicatorId].indexOf(option);
    if (index > -1) this.values[indicatorId].splice(index, 1);
    else this.values[indicatorId].push(option);
    this.initializeGroupedDataIndicators();
    this.emit();
  }

  isMultiSelectSelected(indicatorId: number, option: string): boolean {
    return this.values[indicatorId]?.includes(option) || false;
  }

  // ── GROUPED DATA ──────────────────────────────────────────────

  getSelectedOptionsForGroupedData(ind: ComponentIndicatorModel): string[] {
    if (!ind.config?.parent_field) return [];
    const parent = this.indicators.find(i => i.name === ind.config?.parent_field);
    if (!parent) return [];
    return this.values[parent.id!] || [];
  }

  getGroupedValue(indicatorId: number, groupKey: string, fieldName: string): any {
    const value = this.values[indicatorId]?.[groupKey]?.[fieldName];
    const sf = this.indicators.find(i => i.id === indicatorId)?.config?.sub_fields?.find((f: any) => f.name === fieldName);
    return sf?.type === 'number' ? (value ?? 0) : (value ?? '');
  }

  setGroupedValue(indicatorId: number, groupKey: string, fieldName: string, value: any): void {
    const sf = this.indicators.find(i => i.id === indicatorId)?.config?.sub_fields?.find((f: any) => f.name === fieldName);
    const parsed = sf?.type === 'number' ? toNumber(value) : (value ? String(value) : '');
    this.values = {
      ...this.values,
      [indicatorId]: {
        ...this.values[indicatorId],
        [groupKey]: { ...(this.values[indicatorId]?.[groupKey] || {}), [fieldName]: parsed }
      }
    };
    this.emit();
  }

  getGroupedTotal(indicatorId: number, groupKey: string, subFields: any[]): number {
    const groupData = this.values[indicatorId]?.[groupKey];
    if (!groupData) return 0;
    return subFields.filter(sf => sf.type === 'number')
      .reduce((total, sf) => total + (Number(groupData[sf.name]) || 0), 0);
  }

  getGroupedGrandTotal(indicatorId: number, subFields: any[]): number {
    const allGroups = this.values[indicatorId];
    if (!allGroups || typeof allGroups !== 'object') return 0;
    return Object.keys(allGroups).reduce((total, groupKey) =>
      total + this.getGroupedTotal(indicatorId, groupKey, subFields), 0);
  }

  // ── DATASET SELECT ────────────────────────────────────────────

  private loadDatasetOptions(): void {
    this.indicators.forEach(ind => {
      if (!['dataset_select', 'dataset_multi_select'].includes(ind.field_type)) return;
      if (this.datasetOptions[ind.id!]?.length) return;

      this.datasetLoading[ind.id!] = true;
      this.datasetError[ind.id!] = '';

      this.datasetService.getAll().subscribe({
        next: (datasets) => {
          this.datasetOptions[ind.id!] = datasets.map(d => ({ id: d.id, label: d.name }));
          this.datasetLoading[ind.id!] = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.datasetError[ind.id!] = 'Error al cargar datasets';
          this.datasetLoading[ind.id!] = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  getDatasetOptions(indicatorId: number): { id: number; label: string }[] {
    return this.datasetOptions[indicatorId] || [];
  }

  getDatasetLabelById(indicatorId: number, datasetId: number): string {
    return this.datasetOptions[indicatorId]?.find(d => d.id === datasetId)?.label || String(datasetId);
  }

  setDatasetSelectValue(indicatorId: number, datasetId: number | null): void {
    this.values[indicatorId] = datasetId;
    this.emit();
  }

  toggleDatasetMultiOption(indicatorId: number, datasetId: number): void {
    if (!this.values[indicatorId]) this.values[indicatorId] = [];
    const idx = this.values[indicatorId].indexOf(datasetId);
    if (idx > -1) this.values[indicatorId].splice(idx, 1);
    else this.values[indicatorId].push(datasetId);
    this.values = { ...this.values };
    this.emit();
  }

  isDatasetMultiSelected(indicatorId: number, datasetId: number): boolean {
    return (this.values[indicatorId] || []).includes(datasetId);
  }

  getDatasetSelectLabel(indicatorId: number): string {
    const id = this.values[indicatorId];
    return this.datasetOptions[indicatorId]?.find(d => d.id === id)?.label || '';
  }

  // ── FILE ATTACHMENT ───────────────────────────────────────────

  getFileValue(indicatorId: number): { file_name: string; file_url: string; file_size_mb: number } | null {
    const val = this.values[indicatorId];
    return val?.file_url ? val : null;
  }

  getAcceptString(ind: ComponentIndicatorModel): string {
    const types = ind.config?.allowed_types;
    return types?.length ? types.map((t: string) => `.${t}`).join(',') : '*/*';
  }

  onFileSelected(event: Event, indicatorId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploadErrors[indicatorId] = '';
    this.uploadingFor = indicatorId;
    const formData = new FormData();
    formData.append('file', input.files[0]);
    this.http.post<any>(`${environment.apiUrl}/files/upload`, formData).subscribe({
      next: (result) => { this.uploadingFor = null; this.setValue(indicatorId, result); input.value = ''; },
      error: (err) => {
        this.uploadingFor = null;
        this.uploadErrors[indicatorId] = err.error?.errors?.file || 'Error al subir el archivo';
        input.value = '';
      }
    });
  }

  removeFile(indicatorId: number): void {
    this.setValue(indicatorId, null);
    this.uploadErrors[indicatorId] = '';
  }

  // ── TARGET ───────────────────────────────────────────────────

  getTarget(ind: ComponentIndicatorModel): number | null {
    if (!['number', 'sum_group', 'grouped_data', 'categorized_group'].includes(ind.field_type)) return null;
    if (!this.reportDate || !ind.targets?.length) return null;
    const year = new Date(this.reportDate).getFullYear();
    return ind.targets.find(t => t.year === year)?.target_value ?? null;
  }

  // ── VALIDATION ────────────────────────────────────────────────

  isIndicatorValid(ind: ComponentIndicatorModel): boolean {
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

  // ── RED ANIMALIA ──────────────────────────────────────────────

  hasRedAnimalia(ind: ComponentIndicatorModel): boolean {
    return ind.field_type === 'categorized_group' &&
      (ind.config?.sub_sections || []).some((s: any) => s.key === 'red_animalia');
  }

  openRedAnimaliaModal(ind: ComponentIndicatorModel): void {
    this.redAnimaliaIndicator = ind;
    this.cdr.detectChanges();
    this.redAnimaliaOpen = true;
  }

  closeRedAnimaliaModal(): void {
    this.redAnimaliaOpen = false;
  }

  saveRedAnimalia(result: RedAnimaliaResult): void {
    const id = this.redAnimaliaIndicator?.id!;
    if (!this.values[id]) return;
    if (!this.values[id].sub_sections) this.values[id].sub_sections = {};
    this.values[id].sub_sections['red_animalia'] = result;
    this.values = { ...this.values, [id]: { ...this.values[id] } };
    this.emit();
    this.closeRedAnimaliaModal();
    this.cdr.detectChanges();
  }

  getRedAnimaliaActorName(indicatorId: number): string {
    const actors = this.values[indicatorId]?.sub_sections?.red_animalia?.actors;
    if (!actors?.length) return '';
    if (actors.length === 1) return actors[0].actor_name;
    return `${actors.length} actores asignados`;
  }

  getRedAnimaliaExisting(indicatorId: number): RedAnimaliaResult | null {
    const raw = this.values[indicatorId]?.sub_sections?.red_animalia;
    if (!raw?.actors?.length) return null;
    return raw;
  }

  // ── EMIT ─────────────────────────────────────────────────────

  getActiveIndicatorIds(): Set<number> {
    return new Set(this.activeIndicators.map(i => i.id!));
  }

  getIndicatorId(ind: ComponentIndicatorModel): number { return ind.id!; }

  emit(): void {
    this.valuesChange.emit(sanitizeEmit(this.values, this.activeIndicators));
  }
}
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DatasetService } from '../../../../../../../features/datasets/services/datasets.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-config-categorized-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule],
  templateUrl: './config-categorized-group.html'
})
export class ConfigCategorizedGroupComponent implements OnInit {
  @Input() indicatorGroup!: FormGroup;
  @Input() indicatorIndex!: number;

  metrics: any[] = [];
  subSections: any[] = [];
  datasets: { id: number; name: string }[] = [];
  datasetFields: Record<number, string[]> = {}; // dataset_id → campos disponibles

  constructor(
    private datasetService: DatasetService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const config = (this.indicatorGroup as any)._rawConfig;
    if (config?.metrics) this.metrics = [...config.metrics];
    if (config?.sub_sections) this.subSections = config.sub_sections.map((s: any) => ({ ...s }));

    this.datasetService.getAll().subscribe({
      next: (ds) => {
        this.datasets = ds.map(d => ({ id: d.id, name: d.name }));
        this.cdr.detectChanges(); // ← AGREGAR para forzar renderizado

        // Si ya hay sub-sección red_animalia con dataset_id, carga sus campos
        const ra = this.subSections.find(s => s.key === 'red_animalia');
        if (ra?.dataset_id) {
          this.loadDatasetFields(ra.dataset_id);
        }
      },
      error: (err) => console.error('Error cargando datasets:', err)
    });
  }

  // Carga los campos del dataset seleccionado
  loadDatasetFields(datasetId: number): void {
    this.datasetService.getRecordsByDataset(datasetId).subscribe({
      next: (records) => {
        if (records.length > 0) {
          this.datasetFields[datasetId] = Object.keys(records[0].data || {});
          this.cdr.detectChanges();
        }
      },
      error: () => { }
    });
  }

  // ── Sanitización ────────────────────────────────────────────────

  sanitizeOptionsOnBlur(controlName: string) {
    const control = this.indicatorGroup.get(controlName);
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => line.trim().toUpperCase())
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }

  sanitizeGroupsOnBlur() {
    const control = this.indicatorGroup.get('cgGroups');
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => {
        const t = line.trim();
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      })
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }

  // ── Métricas ────────────────────────────────────────────────────

  addMetric() {
    this.metrics.push({ key: '', label: '' });
  }

  removeMetric(j: number) {
    this.metrics.splice(j, 1);
  }

  updateMetric(j: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    if (field === 'key') value = this.sanitizeTechName(value);
    this.metrics[j][field] = value;
  }

  // ── Sub-secciones ───────────────────────────────────────────────

  addSubSection() {
    this.subSections.push({ key: '', label: '', max_source: 'metrics_total' });
  }

  removeSubSection(j: number) {
    this.subSections.splice(j, 1);
  }

  updateSubSection(j: number, field: string, event: any) {
    let value = event.target ? event.target.value : event;
    if (field === 'key') value = this.sanitizeTechName(value);
    this.subSections[j][field] = value;
  }

  updateSubSectionDatasetId(j: number, value: any): void {
    const id = value ? Number(value) : null;
    this.subSections[j]['dataset_id'] = id;
    this.subSections[j]['label_field'] = null; // reset al cambiar dataset
    if (id) this.loadDatasetFields(id);
  }

  updateSubSectionLabelField(j: number, value: any): void {
    this.subSections[j]['label_field'] = value || null;
  }

  getFieldsForSubSection(j: number): string[] {
    const id = this.subSections[j]?.dataset_id;
    return id ? (this.datasetFields[id] || []) : [];
  }

  // ── Serialización (llamada desde el padre en serializeIndicators) ─

  getConfig(): any {
    const categories = (this.indicatorGroup.get('cgCategories')?.value || '')
      .split('\n').map((c: string) => c.trim()).filter((c: string) => c.length > 0);

    const groups = (this.indicatorGroup.get('cgGroups')?.value || '')
      .split('\n').map((g: string) => g.trim()).filter((g: string) => g.length > 0);

    const validMetrics = this.metrics.filter(m => m.key && m.label);

    const validSubSections = this.subSections
      .filter(s => s.key && s.label)
      .map(s => {
        const section: any = { key: s.key, label: s.label, max_source: 'metrics_total' };
        if (s.key === 'red_animalia' && s.dataset_id) {
          section.dataset_id = s.dataset_id;
          if (s.label_field) section.label_field = s.label_field;
        }
        return section;
      });

    return {
      category_label: this.indicatorGroup.get('cgCategoryLabel')?.value?.trim() || '',
      categories,
      groups,
      metrics: validMetrics,
      ...(validSubSections.length > 0 && { sub_sections: validSubSections })
    };
  }

  private sanitizeTechName(value: string): string {
    return value.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }




}
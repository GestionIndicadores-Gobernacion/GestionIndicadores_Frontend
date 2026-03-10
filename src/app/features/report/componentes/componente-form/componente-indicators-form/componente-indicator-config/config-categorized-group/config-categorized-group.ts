import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-categorized-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-categorized-group.html'
})
export class ConfigCategorizedGroupComponent implements OnInit {
  @Input() indicatorGroup!: FormGroup;
  @Input() indicatorIndex!: number;

  metrics: any[] = [];
  subSections: any[] = [];

  ngOnInit(): void {
    // Restaurar desde config si venimos de edición
    const config = (this.indicatorGroup as any)._rawConfig;
    if (config?.metrics) this.metrics = [...config.metrics];
    if (config?.sub_sections) this.subSections = [...config.sub_sections];
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

  // ── Serialización (llamada desde el padre en serializeIndicators) ─

  getConfig(): any {
    const categories = (this.indicatorGroup.get('cgCategories')?.value || '')
      .split('\n').map((c: string) => c.trim()).filter((c: string) => c.length > 0);

    const groups = (this.indicatorGroup.get('cgGroups')?.value || '')
      .split('\n').map((g: string) => g.trim()).filter((g: string) => g.length > 0);

    const validMetrics = this.metrics.filter(m => m.key && m.label);
    const validSubSections = this.subSections
      .filter(s => s.key && s.label)
      .map(s => ({ ...s, max_source: 'metrics_total' }));

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
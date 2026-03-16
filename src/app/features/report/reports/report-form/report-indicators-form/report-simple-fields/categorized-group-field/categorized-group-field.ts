import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RedAnimaliaModalComponent, RedAnimaliaResult } from '../../red-animalia-modal/red-animalia-modal';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';
import { toNumber, getCategoryMetricTotal, getCategorizedGrandTotal } from '../../helpers/report-indicators.helpers';

@Component({
  selector: 'app-categorized-group-field',
  standalone: true,
  imports: [CommonModule, FormsModule, RedAnimaliaModalComponent],
  templateUrl: './categorized-group-field.html'
})
export class CategorizedGroupFieldComponent {

  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: any = { selected_categories: [], data: {}, sub_sections: {} };
  @Input() interventionLocation: string | null = null;
  @Output() valueChange = new EventEmitter<any>();

  redAnimaliaOpen = false;

  get selectedCategories(): string[] {
    return this.value?.selected_categories || [];
  }

  isCategorySelected(cat: string): boolean {
    return this.selectedCategories.includes(cat);
  }

  toggleCategory(category: string): void {
    const val = this.deepClone();
    const metrics: any[] = this.indicator.config?.metrics || [];
    const groups: string[] = this.indicator.config?.groups || [];
    const subSections: any[] = this.indicator.config?.sub_sections || [];

    const idx = val.selected_categories.indexOf(category);

    if (idx > -1) {

      val.selected_categories.splice(idx, 1);
      delete val.data[category];

      subSections.forEach((s: any) => {
        if (s.key === 'red_animalia') return;
        if (val.sub_sections[s.key]) delete val.sub_sections[s.key][category];
      });

    } else {

      val.selected_categories.push(category);
      val.data[category] = {};

      groups.forEach(g => {
        val.data[category][g] = {};
        metrics.forEach(m => val.data[category][g][m.key] = 0);
      });

      subSections.forEach((s: any) => {

        if (s.key === 'red_animalia') return;

        if (!val.sub_sections[s.key]) val.sub_sections[s.key] = {};
        val.sub_sections[s.key][category] = {};

        metrics.forEach(m => {
          val.sub_sections[s.key][category][m.key] = 0;
        });

      });

    }

    this.valueChange.emit(val);
  }

  metricValue(cat: string, group: string, key: string): number {
    return this.value?.data?.[cat]?.[group]?.[key] ?? 0;
  }

  setMetricValue(cat: string, group: string, key: string, raw: any): void {
    const val = this.deepClone();
    val.data[cat][group][key] = toNumber(raw);
    this.valueChange.emit(val);
  }

  metricTotal(cat: string, key: string): number {
    return getCategoryMetricTotal(
      { [this.indicator.id!]: this.value },
      this.indicator.id!,
      cat,
      key
    );
  }

  allMetricsTotal(cat: string): number {
    return (this.indicator.config?.metrics || [])
      .reduce((s: number, m: any) => s + this.metricTotal(cat, m.key), 0);
  }

  get grandTotal(): number {
    return getCategorizedGrandTotal(
      { [this.indicator.id!]: this.value },
      this.indicator
    );
  }

  subSectionValue(sectionKey: string, cat: string, metricKey: string): number {
    return this.value?.sub_sections?.[sectionKey]?.[cat]?.[metricKey] ?? 0;
  }

  setSubSectionValue(sectionKey: string, cat: string, metricKey: string, raw: any): void {

    const val = this.deepClone();

    if (!val.sub_sections[sectionKey]) val.sub_sections[sectionKey] = {};
    if (!val.sub_sections[sectionKey][cat]) val.sub_sections[sectionKey][cat] = {};

    val.sub_sections[sectionKey][cat][metricKey] = toNumber(raw);

    this.valueChange.emit(val);
  }

  isOverLimit(section: any, cat: string, metricKey: string): boolean {

    if (section.max_source !== 'metrics_total') return false;

    return this.subSectionValue(section.key, cat, metricKey)
      > this.metricTotal(cat, metricKey);

  }

  get hasRedAnimalia(): boolean {
    return (this.indicator.config?.sub_sections || [])
      .some((s: any) => s.key === 'red_animalia');
  }

  get redAnimaliaActorName(): string {

    const actors = this.value?.sub_sections?.red_animalia?.actors;

    if (!actors?.length) return '';

    return actors.length === 1
      ? actors[0].actor_name
      : `${actors.length} actores asignados`;

  }

  get existingRedAnimalia(): RedAnimaliaResult | null {

    const raw = this.value?.sub_sections?.red_animalia;

    return raw?.actors?.length ? raw : null;

  }

  onSaveRedAnimalia(result: RedAnimaliaResult): void {

    const val = this.deepClone();

    if (!val.sub_sections) val.sub_sections = {};

    if (!result?.actors?.length) {
      delete val.sub_sections['red_animalia'];
    } else {
      val.sub_sections['red_animalia'] = result;
    }

    this.valueChange.emit(val);

    this.redAnimaliaOpen = false;
  }

  private deepClone(): any {
    return JSON.parse(
      JSON.stringify(
        this.value || { selected_categories: [], data: {}, sub_sections: {} }
      )
    );
  }

}
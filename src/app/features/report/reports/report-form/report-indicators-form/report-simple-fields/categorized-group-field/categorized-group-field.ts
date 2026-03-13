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
  template: `
    <div class="space-y-5">
 
      <!-- Selector de categorías -->
      <div>
        <p class="text-xs font-semibold text-zinc-700 mb-2 uppercase tracking-wide">
          {{ indicator.config?.category_label || 'Categorías' }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button *ngFor="let cat of indicator.config?.categories" type="button"
            (click)="toggleCategory(cat)"
            [class.bg-zinc-900]="isCategorySelected(cat)"
            [class.text-white]="isCategorySelected(cat)"
            [class.border-zinc-900]="isCategorySelected(cat)"
            [class.bg-white]="!isCategorySelected(cat)"
            [class.text-zinc-700]="!isCategorySelected(cat)"
            [class.border-zinc-300]="!isCategorySelected(cat)"
            class="px-3 py-1.5 text-xs font-medium border rounded-full transition-all duration-150 hover:border-zinc-600 cursor-pointer">
            {{ cat }}
          </button>
        </div>
        <p *ngIf="indicator.is_required && selectedCategories.length === 0"
          class="text-xs text-red-500 mt-1.5">Selecciona al menos una categoría</p>
      </div>
 
      <!-- Tabla por categoría -->
      <div *ngFor="let cat of selectedCategories" class="border border-zinc-200 rounded-xl overflow-hidden">
        <div class="px-4 py-3 bg-zinc-900 flex items-center justify-between">
          <span class="text-sm font-semibold text-white">{{ cat }}</span>
          <span class="text-xs text-zinc-400">
            Total: <span class="text-white font-bold tabular-nums">{{ allMetricsTotal(cat) }}</span>
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-zinc-50 border-b border-zinc-200">
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider w-48">Indicador</th>
                <th *ngFor="let group of indicator.config?.groups"
                  class="px-4 py-2.5 text-center text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  {{ group }}
                </th>
                <th class="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              <tr *ngFor="let metric of indicator.config?.metrics; let mi = index"
                [class.bg-white]="mi % 2 === 0" [class.bg-zinc-50]="mi % 2 !== 0">
                <td class="px-4 py-2.5 text-xs font-medium text-zinc-700 leading-tight">{{ metric.label }}</td>
                <td *ngFor="let group of indicator.config?.groups" class="px-3 py-2 text-center">
                  <input type="number" min="0"
                    [ngModel]="metricValue(cat, group, metric.key)"
                    (ngModelChange)="setMetricValue(cat, group, metric.key, $event)"
                    placeholder="0"
                    class="w-20 px-2 py-1.5 text-sm text-center border border-zinc-200 rounded-lg bg-white text-zinc-900
                           focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors tabular-nums" />
                </td>
                <td class="px-4 py-2.5 text-center">
                  <span class="text-sm font-bold text-zinc-900 tabular-nums">
                    {{ metricTotal(cat, metric.key) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
 
        <!-- Sub-secciones -->
        <ng-container *ngIf="indicator.config?.sub_sections?.length > 0">
          <div *ngFor="let section of indicator.config?.sub_sections" class="border-t border-zinc-200">
            <div class="px-4 py-2.5 bg-zinc-100 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs font-semibold text-zinc-700">{{ section.label }}</p>
              <span *ngIf="section.max_source === 'metrics_total'"
                class="text-xs text-zinc-400 ml-auto">valor ≤ total de cada métrica</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="bg-zinc-50 border-b border-zinc-100">
                    <th class="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider w-48">Indicador</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-zinc-700 uppercase tracking-wider">Valor</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">Máx</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                  <tr *ngFor="let metric of indicator.config?.metrics; let mi = index"
                    [class.bg-white]="mi % 2 === 0" [class.bg-zinc-50]="mi % 2 !== 0">
                    <td class="px-4 py-2 text-xs font-medium text-zinc-700">{{ metric.label }}</td>
                    <td class="px-3 py-2 text-center">
                      <input type="number" min="0"
                        [ngModel]="subSectionValue(section.key, cat, metric.key)"
                        (ngModelChange)="setSubSectionValue(section.key, cat, metric.key, $event)"
                        placeholder="0"
                        [class.border-red-400]="isOverLimit(section, cat, metric.key)"
                        class="w-20 px-2 py-1.5 text-sm text-center border border-zinc-200 rounded-lg bg-white text-zinc-900
                               focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors tabular-nums" />
                      <p *ngIf="isOverLimit(section, cat, metric.key)" class="text-xs text-red-500 mt-0.5">Supera el total</p>
                    </td>
                    <td class="px-4 py-2 text-center text-xs text-zinc-400 tabular-nums">
                      {{ metricTotal(cat, metric.key) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>
      </div>
 
      <!-- Estado vacío -->
      <div *ngIf="selectedCategories.length === 0"
        class="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
        <p class="text-xs text-zinc-400">Selecciona una o más categorías para ingresar los datos</p>
      </div>
 
      <!-- Grand total -->
      <div *ngIf="selectedCategories.length > 0"
        class="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl shadow">
        <div>
          <p class="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total animales atendidos</p>
          <p class="text-xs text-zinc-500 mt-0.5">Suma de todas las métricas en todas las categorías</p>
        </div>
        <span class="text-2xl font-black text-white tabular-nums">{{ grandTotal }}</span>
      </div>
 
      <!-- Red Animalia -->
      <ng-container *ngIf="hasRedAnimalia && selectedCategories.length > 0">
        <div class="flex items-center justify-between p-4 border border-emerald-200 bg-emerald-50 rounded-xl">
          <div>
            <p class="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Red Animalia</p>
            <p *ngIf="redAnimaliaActorName" class="text-xs text-emerald-700 mt-0.5">
              Actor: <span class="font-medium">{{ redAnimaliaActorName }}</span>
            </p>
            <p *ngIf="!redAnimaliaActorName" class="text-xs text-emerald-600 mt-0.5">Sin actor asignado</p>
          </div>
          <button type="button" (click)="redAnimaliaOpen = true"
            class="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer">
            {{ redAnimaliaActorName ? 'Editar' : 'Reportar Red Animalia' }}
          </button>
        </div>
      </ng-container>
    </div>
 
    <app-red-animalia-modal
      [open]="redAnimaliaOpen"
      [indicator]="indicator"
      [interventionLocation]="interventionLocation"
      [existing]="existingRedAnimalia"
      (save)="onSaveRedAnimalia($event)"
      (close)="redAnimaliaOpen = false">
    </app-red-animalia-modal>
  `
})
export class CategorizedGroupFieldComponent {
  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: any = { selected_categories: [], data: {}, sub_sections: {} };
  @Input() interventionLocation: string | null = null;
  @Output() valueChange = new EventEmitter<any>();

  redAnimaliaOpen = false;

  // ── Categorías ───────────────────────────────────────────────

  get selectedCategories(): string[] { return this.value?.selected_categories || []; }

  isCategorySelected(cat: string): boolean { return this.selectedCategories.includes(cat); }

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
        metrics.forEach(m => { val.data[category][g][m.key] = 0; });
      });
      subSections.forEach((s: any) => {
        if (s.key === 'red_animalia') return;
        if (!val.sub_sections[s.key]) val.sub_sections[s.key] = {};
        val.sub_sections[s.key][category] = {};
        metrics.forEach(m => { val.sub_sections[s.key][category][m.key] = 0; });
      });
    }
    this.valueChange.emit(val);
  }

  // ── Métricas ─────────────────────────────────────────────────

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
    return (this.indicator.config?.metrics || []).reduce(
      (s: number, m: any) => s + this.metricTotal(cat, m.key), 0
    );
  }

  get grandTotal(): number {
    return getCategorizedGrandTotal({ [this.indicator.id!]: this.value }, this.indicator);
  }

  // ── Sub-secciones ────────────────────────────────────────────

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
    return this.subSectionValue(section.key, cat, metricKey) > this.metricTotal(cat, metricKey);
  }

  // ── Red Animalia ─────────────────────────────────────────────

  get hasRedAnimalia(): boolean {
    return (this.indicator.config?.sub_sections || []).some((s: any) => s.key === 'red_animalia');
  }

  get redAnimaliaActorName(): string {
    const actors = this.value?.sub_sections?.red_animalia?.actors;
    if (!actors?.length) return '';
    return actors.length === 1 ? actors[0].actor_name : `${actors.length} actores asignados`;
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

  // ── Utils ────────────────────────────────────────────────────

  private deepClone(): any {
    return JSON.parse(JSON.stringify(this.value || { selected_categories: [], data: {}, sub_sections: {} }));
  }
}

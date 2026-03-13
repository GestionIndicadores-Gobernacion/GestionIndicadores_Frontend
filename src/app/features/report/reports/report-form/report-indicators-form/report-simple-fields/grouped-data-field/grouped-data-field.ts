import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';
import { toNumber } from '../../helpers/report-indicators.helpers';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-grouped-data-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
 
      <div *ngIf="selectedGroups.length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p class="text-xs text-amber-800">
          <strong>Primero selecciona opciones en:</strong> {{ indicator.config?.parent_field }}
        </p>
      </div>
 
      <div *ngFor="let groupKey of selectedGroups" class="border border-zinc-200 rounded-lg overflow-hidden">
        <div class="px-4 py-2 bg-zinc-100 border-b border-zinc-200">
          <h4 class="text-sm font-semibold text-zinc-900">{{ groupKey }}</h4>
        </div>
        <div class="p-4 space-y-3">
          <div *ngFor="let sf of indicator.config?.sub_fields" class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-zinc-700">{{ sf.label || sf.name }}</label>
            <input *ngIf="sf.type === 'number'" type="number"
              [ngModel]="getValue(groupKey, sf.name)"
              (ngModelChange)="setValue(groupKey, sf.name, $event, 'number')"
              placeholder="0" min="0"
              class="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900
                     focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900" />
            <textarea *ngIf="sf.type === 'text'" rows="2"
              [ngModel]="getValue(groupKey, sf.name)"
              (ngModelChange)="setValue(groupKey, sf.name, $event, 'text')"
              placeholder="Escribe aquí..."
              class="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900
                     resize-none focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900">
            </textarea>
          </div>
          <div *ngIf="indicator.config?.auto_total"
            class="flex items-center justify-between p-3 bg-zinc-900 rounded-lg mt-3">
            <span class="text-xs font-semibold text-white uppercase tracking-wide">Total</span>
            <span class="text-base font-bold text-white tabular-nums">{{ groupTotal(groupKey) }}</span>
          </div>
        </div>
      </div>
 
      <div *ngIf="indicator.config?.auto_total && selectedGroups.length > 1"
        class="flex items-center justify-between p-4 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg shadow-lg">
        <span class="text-sm font-bold text-white uppercase tracking-wide">Total General</span>
        <span class="text-xl font-black text-white tabular-nums">{{ grandTotal }}</span>
      </div>
    </div>
  `
})
export class GroupedDataFieldComponent {
  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: Record<string, Record<string, any>> = {};
  @Input() selectedGroups: string[] = [];
  @Output() valueChange = new EventEmitter<Record<string, Record<string, any>>>();

  getValue(groupKey: string, fieldName: string): any {
    const sf = this.indicator.config?.sub_fields?.find((f: any) => f.name === fieldName);
    const v = this.value?.[groupKey]?.[fieldName];
    return sf?.type === 'number' ? (v ?? 0) : (v ?? '');
  }

  setValue(groupKey: string, fieldName: string, raw: any, type: 'number' | 'text'): void {
    const parsed = type === 'number' ? toNumber(raw) : (raw ? String(raw) : '');
    this.valueChange.emit({
      ...this.value,
      [groupKey]: { ...(this.value?.[groupKey] || {}), [fieldName]: parsed }
    });
  }

  groupTotal(groupKey: string): number {
    const data = this.value?.[groupKey];
    if (!data) return 0;
    return (this.indicator.config?.sub_fields || [])
      .filter((sf: any) => sf.type === 'number')
      .reduce((t: number, sf: any) => t + (Number(data[sf.name]) || 0), 0);
  }

  get grandTotal(): number {
    return this.selectedGroups.reduce((t, k) => t + this.groupTotal(k), 0);
  }
}
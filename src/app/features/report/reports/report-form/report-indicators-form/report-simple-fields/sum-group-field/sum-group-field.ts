import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';
import { toNumber } from '../../helpers/report-indicators.helpers';

@Component({
  selector: 'app-sum-group-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2">
      <div *ngFor="let field of indicator.config?.fields"
        class="flex items-center gap-3 p-2 bg-zinc-50 rounded-lg border border-zinc-100">
        <label class="flex-1 text-xs text-zinc-700 leading-tight">{{ field }}</label>
        <input type="number" [ngModel]="(value || {})[field]"
          (ngModelChange)="setField(field, $event)"
          placeholder="0" min="0"
          class="w-24 px-3 py-1.5 text-sm text-right border border-zinc-200 rounded-lg bg-white text-zinc-900
                 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors duration-150" />
      </div>
      <div class="flex items-center justify-between p-2 bg-zinc-900 rounded-lg">
        <span class="text-xs font-semibold text-white uppercase tracking-wide">Total</span>
        <span class="text-base font-bold text-white tabular-nums">{{ total }}</span>
      </div>
    </div>
  `
})
export class SumGroupFieldComponent {
  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: Record<string, number> = {};
  @Output() valueChange = new EventEmitter<Record<string, number>>();

  get total(): number {
    return Object.values(this.value || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  }

  setField(field: string, raw: any): void {
    this.valueChange.emit({ ...(this.value || {}), [field]: toNumber(raw) });
  }
}
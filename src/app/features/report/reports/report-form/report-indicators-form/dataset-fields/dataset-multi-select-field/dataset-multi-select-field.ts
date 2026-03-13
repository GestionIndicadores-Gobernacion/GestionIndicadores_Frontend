import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';

interface DatasetOption { id: number; label: string; }

@Component({
  selector: 'app-dataset-multi-select-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div *ngIf="loading" class="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
        <div class="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
        <span class="text-xs text-zinc-500">Cargando datasets...</span>
      </div>
      <div *ngIf="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-xs text-red-600">{{ error }}</p>
      </div>
      <div *ngIf="!loading && !error" class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        <div *ngFor="let ds of options"
          class="flex items-center gap-3 p-2.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
          (click)="toggle(ds.id)">
          <input type="checkbox" [checked]="isSelected(ds.id)"
            class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900 cursor-pointer pointer-events-none" />
          <label class="flex-1 text-sm text-zinc-700 cursor-pointer select-none">{{ ds.label }}</label>
        </div>
        <div *ngIf="options.length === 0"
          class="p-4 text-center text-xs text-zinc-400 border border-dashed border-zinc-300 rounded-lg">
          No hay datasets disponibles
        </div>
      </div>
      <div *ngIf="(value || []).length > 0" class="flex flex-wrap gap-1.5 pt-1">
        <span *ngFor="let id of value"
          class="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white text-xs rounded-full">
          {{ labelFor(id) }}
          <button type="button" (click)="toggle(id)"
            class="hover:text-zinc-300 transition-colors ml-0.5 cursor-pointer">×</button>
        </span>
      </div>
    </div>
  `
})
export class DatasetMultiSelectFieldComponent {
  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: number[] = [];
  @Input() options: DatasetOption[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() valueChange = new EventEmitter<number[]>();

  isSelected(id: number): boolean { return (this.value || []).includes(id); }

  labelFor(id: number): string { return this.options.find(d => d.id === id)?.label || String(id); }

  toggle(id: number): void {
    const current = [...(this.value || [])];
    const idx = current.indexOf(id);
    idx > -1 ? current.splice(idx, 1) : current.push(id);
    this.valueChange.emit(current);
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';

@Component({
  selector: 'app-multi-select-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div *ngFor="let option of indicator.config?.options"
        class="flex items-center gap-3 p-2.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
        (click)="toggle(option)">
        <input type="checkbox" [checked]="isSelected(option)"
          class="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900 cursor-pointer pointer-events-none" />
        <label class="flex-1 text-sm text-zinc-700 cursor-pointer select-none">{{ option }}</label>
      </div>
    </div>
  `
})
export class MultiSelectFieldComponent {
  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: string[] = [];
  @Output() valueChange = new EventEmitter<string[]>();

  isSelected(option: string): boolean { return (this.value || []).includes(option); }

  toggle(option: string): void {
    const current = [...(this.value || [])];
    const idx = current.indexOf(option);
    idx > -1 ? current.splice(idx, 1) : current.push(option);
    this.valueChange.emit(current);
  }

}

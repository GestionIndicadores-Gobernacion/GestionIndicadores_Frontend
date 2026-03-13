import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select [ngModel]="value" (ngModelChange)="valueChange.emit($event)"
      class="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900
             cursor-pointer focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors duration-150">
      <option [ngValue]="null" disabled>Seleccionar opción</option>
      <option *ngFor="let op of indicator.config?.options" [ngValue]="op">{{ op }}</option>
    </select>
  `
})
export class SelectFieldComponent {
  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();
}

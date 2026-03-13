import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toNumber } from '../../helpers/report-indicators.helpers';

@Component({
  selector: 'app-number-field',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input type="number" [ngModel]="value" (ngModelChange)="valueChange.emit(toNumber($event))"
      placeholder="0"
      class="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900
             focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors duration-150" />
  `
})
export class NumberFieldComponent {
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();
  toNumber = toNumber;

}

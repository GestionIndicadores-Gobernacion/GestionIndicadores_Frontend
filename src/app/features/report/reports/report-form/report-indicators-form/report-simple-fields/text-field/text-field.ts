import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-field',
  standalone: true,
  imports: [FormsModule],
  template: `
    <textarea rows="2" [ngModel]="value" (ngModelChange)="valueChange.emit($event)"
      placeholder="Escribe aquí..."
      class="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900
             resize-none focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors duration-150">
    </textarea>
  `
})
export class TextFieldComponent {
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();
}

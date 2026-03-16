import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';

@Component({
  selector: 'app-multi-select-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-select-field.html'
})
export class MultiSelectFieldComponent {

  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: string[] = [];
  @Output() valueChange = new EventEmitter<string[]>();

  isSelected(option: string): boolean {
    return (this.value || []).includes(option);
  }

  toggle(option: string): void {
    const current = [...(this.value || [])];
    const idx = current.indexOf(option);

    idx > -1 ? current.splice(idx, 1) : current.push(option);

    this.valueChange.emit(current);
  }

}
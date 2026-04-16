import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ComponentIndicatorModel } from '../../../../../../../features/report/models/component.model';

interface DatasetOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-dataset-multi-select-field',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dataset-multi-select-field.html'
})
export class DatasetMultiSelectFieldComponent {

  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: number[] = [];
  @Input() options: DatasetOption[] = [];
  @Input() loading = false;
  @Input() error = '';

  @Output() valueChange = new EventEmitter<number[]>();

  isSelected(id: number): boolean {
    return (this.value || []).includes(id);
  }

  labelFor(id: number): string {
    return this.options.find(d => d.id === id)?.label || String(id);
  }

  toggle(id: number): void {
    const current = [...(this.value || [])];
    const idx = current.indexOf(id);

    idx > -1 ? current.splice(idx, 1) : current.push(id);

    this.valueChange.emit(current);
  }

}
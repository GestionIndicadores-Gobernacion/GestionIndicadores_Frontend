import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentIndicatorModel } from '../../../../../../../features/report/models/component.model';
import { toNumber } from '../../helpers/report-indicators.helpers';

@Component({
  selector: 'app-sum-group-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sum-group-field.html'
})
export class SumGroupFieldComponent {

  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: Record<string, number> = {};
  @Output() valueChange = new EventEmitter<Record<string, number>>();

  get total(): number {
    return Object.values(this.value || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  }

  setField(field: string, raw: any): void {
    this.valueChange.emit({
      ...(this.value || {}),
      [field]: toNumber(raw)
    });
  }

}
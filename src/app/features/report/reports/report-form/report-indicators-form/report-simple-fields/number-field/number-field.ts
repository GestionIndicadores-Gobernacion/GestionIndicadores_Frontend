import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { toNumber } from '../../helpers/report-indicators.helpers';

@Component({
  selector: 'app-number-field',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './number-field.html'
})
export class NumberFieldComponent {

  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();

  toNumber = toNumber;

}
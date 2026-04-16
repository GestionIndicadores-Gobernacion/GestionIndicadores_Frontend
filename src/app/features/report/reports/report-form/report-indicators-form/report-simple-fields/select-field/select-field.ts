import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ComponentIndicatorModel } from '../../../../../../../features/report/models/component.model';

@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './select-field.html'
})
export class SelectFieldComponent {

  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();

}
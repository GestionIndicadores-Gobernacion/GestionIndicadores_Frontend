import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-field',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './text-field.html'
})
export class TextFieldComponent {

  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();

}
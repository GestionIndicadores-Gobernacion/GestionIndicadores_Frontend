import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './date-field.html',
  styleUrl: './date-field.css',
})
export class DateFieldComponent {

  @Input() value: any;
  @Output() valueChange = new EventEmitter<any>();

}

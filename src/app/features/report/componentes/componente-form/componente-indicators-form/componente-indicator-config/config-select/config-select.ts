import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-select.html'
})
export class ConfigSelectComponent {
  @Input() indicatorGroup!: FormGroup;
  @Input() indicatorIndex!: number;
  @Input() isMulti = false;

  sanitizeOptionsOnBlur() {
    const control = this.indicatorGroup.get('configOptions');
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => line.trim().toUpperCase())
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }
}
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-sum-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-sum-group.html'
})
export class ConfigSumGroupComponent {
  @Input() indicatorGroup!: FormGroup;

  capitalizeWords(value: string): string {
    return value.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  sanitizeFieldsOnBlur() {
    const control = this.indicatorGroup.get('configFields');
    if (!control?.value) return;
    const sanitized = control.value
      .split('\n')
      .map((line: string) => this.capitalizeWords(line.trim()))
      .filter((line: string) => line.length > 0)
      .join('\n');
    control.setValue(sanitized, { emitEvent: false });
  }
}
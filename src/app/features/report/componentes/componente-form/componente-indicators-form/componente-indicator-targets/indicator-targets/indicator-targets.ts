import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-indicator-targets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './indicator-targets.html'
})
export class IndicatorTargetsComponent {
  @Input() indicatorGroup!: FormGroup;
  @Input() fieldType = '';

  constructor(private fb: FormBuilder) { }

  get targets(): FormArray<FormGroup> {
    return (this.indicatorGroup.get('targets') as FormArray<FormGroup>) ?? this.fb.array([]);
  }

  get showGroupedNote(): boolean {
    return ['grouped_data', 'categorized_group'].includes(this.fieldType);
  }

  addTarget() {
    this.targets.push(this.fb.group({
      id: [null],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2100)]],
      target_value: [null, [Validators.required, Validators.min(0.0001)]]
    }));
  }

  removeTarget(j: number) {
    this.targets.removeAt(j);
  }
}
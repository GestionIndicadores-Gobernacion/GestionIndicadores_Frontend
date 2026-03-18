import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-show-if',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './config-show-if.html',
  styleUrl: './config-show-if.css',
})
export class ConfigShowIfComponent implements OnInit, OnChanges {

  @Input() indicatorGroup!: FormGroup;
  @Input() allIndicatorControls: AbstractControl[] = [];
  @Input() currentIndex: number = 0;

  selectIndicators: { name: string; options: string[] }[] = [];

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.refresh();
    this.indicatorGroup.get('configShowIfIndicatorName')?.valueChanges.subscribe(() => {
      this.indicatorGroup.get('configShowIfValue')?.setValue(null, { emitEvent: false });
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allIndicatorControls'] || changes['currentIndex']) {
      this.refresh();
    }
  }

  private refresh(): void {
    this.selectIndicators = this.allIndicatorControls
      .slice(0, this.currentIndex)
      .filter(ctrl =>
        ctrl.get('field_type')?.value === 'select' ||
        ctrl.get('field_type')?.value === 'multi_select'  // ← agregar
      )
      .map(ctrl => ({
        name: ctrl.get('name')?.value,
        options: (ctrl.get('configOptions')?.value || '')
          .split('\n')
          .map((o: string) => o.trim())
          .filter((o: string) => o.length > 0)
      }))
      .filter(ind => ind.name);
  }
  get showIfIndicatorName(): string {
    return this.indicatorGroup.get('configShowIfIndicatorName')?.value || '';
  }

  get showIfValue(): string {
    return this.indicatorGroup.get('configShowIfValue')?.value || '';
  }

  get parentOptions(): string[] {
    return this.selectIndicators.find(i => i.name === this.showIfIndicatorName)?.options || [];
  }

  clearShowIf(): void {
    this.indicatorGroup.get('configShowIfIndicatorName')?.setValue(null);
    this.indicatorGroup.get('configShowIfValue')?.setValue(null);
  }
}

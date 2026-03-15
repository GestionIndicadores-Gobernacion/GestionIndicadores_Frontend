import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DatasetOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-dataset-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dataset-select-field.html'
})
export class DatasetSelectFieldComponent implements OnChanges {

  @Input() indicator!: ComponentIndicatorModel;
  @Input() value: number | null = null;
  @Input() options: DatasetOption[] = [];
  @Input() loading = false;
  @Input() error = '';

  @Output() valueChange = new EventEmitter<number | null>();

  search = '';
  filteredOptions: DatasetOption[] = [];

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['options']) {
      this.filteredOptions = this.options || [];
      this.cdr.markForCheck();
    }

    if (changes['loading'] || changes['error']) {
      this.cdr.markForCheck();
    }

  }

  filter(): void {
    const q = this.search.toLowerCase().trim();

    this.filteredOptions = q
      ? this.options.filter(o => o.label.toLowerCase().includes(q))
      : this.options;

    this.cdr.markForCheck();
  }

  select(opt: DatasetOption): void {
    this.valueChange.emit(opt.id);
    this.cdr.markForCheck();
  }

  get selectedLabel(): string {
    return this.options.find(d => d.id === this.value)?.label || '';
  }

}
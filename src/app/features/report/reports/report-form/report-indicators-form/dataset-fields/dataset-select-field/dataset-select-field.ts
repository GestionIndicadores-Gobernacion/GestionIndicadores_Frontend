import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../../../core/models/component.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DatasetOption { id: number; label: string; }

@Component({
  selector: 'app-dataset-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2">

      <!-- loading -->
      <div *ngIf="loading" class="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
        <div class="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
        <span class="text-xs text-zinc-500">Cargando datasets...</span>
      </div>

      <!-- error -->
      <div *ngIf="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-xs text-red-600">{{ error }}</p>
      </div>

      <!-- buscador -->
      <div *ngIf="!loading && !error" class="space-y-2">

        <input
          type="text"
          [(ngModel)]="search"
          (ngModelChange)="filter()"
          placeholder="Buscar actor por nombre..."
          class="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white
                 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />

        <!-- lista -->
        <div class="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg divide-y">

          <div
            *ngFor="let opt of filteredOptions"
            (click)="select(opt)"
            class="px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50"
            [class.bg-zinc-900]="value === opt.id"
            [class.text-white]="value === opt.id"
          >
            {{ opt.label }}
          </div>

          <div *ngIf="filteredOptions.length === 0"
               class="p-3 text-xs text-zinc-400 text-center">
            No se encontraron actores
          </div>

        </div>

      </div>

      <!-- seleccionado -->
      <div *ngIf="value" class="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg">
        <span class="text-xs text-zinc-500">Seleccionado:</span>
        <span class="text-xs font-medium text-zinc-900">{{ selectedLabel }}</span>
      </div>

    </div>
  `
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.filteredOptions = this.options;
    }
  }

  filter(): void {
    const q = this.search.toLowerCase().trim();
    this.filteredOptions = q
      ? this.options.filter(o => o.label.toLowerCase().includes(q))
      : this.options;
  }

  select(opt: DatasetOption): void {
    this.valueChange.emit(opt.id);
  }

  get selectedLabel(): string {
    return this.options.find(d => d.id === this.value)?.label || '';
  }
}
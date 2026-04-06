import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KPI_OPTIONS } from '../../reports-map.types';

@Component({
  selector: 'app-map-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-toolbar.html',
})
export class MapToolbarComponent {
  @Input() selectedKpi = 'asistencias';
  @Input() selectedYear!: number;
  @Input() availableYears: number[] = [];

  @Output() kpiChange = new EventEmitter<string>();
  @Output() yearChange = new EventEmitter<number>();

  readonly KPI_OPTIONS = KPI_OPTIONS;
}
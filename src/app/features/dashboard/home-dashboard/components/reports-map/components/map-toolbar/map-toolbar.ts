// components/map-toolbar/map-toolbar.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KpiOption, KPI_OPTIONS, MapStyle, MAP_STYLES } from '../../reports-map.types';

@Component({
  selector: 'app-map-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-toolbar.html',
})
export class MapToolbarComponent {
  @Input() searchQuery = '';
  @Input() selectedYear!: number;
  @Input() availableYears: number[] = [];
  @Input() selectedKpi = 'asistencias';
  @Input() selectedStyleId = 'light';

  @Output() searchChange    = new EventEmitter<string>();
  @Output() yearChange      = new EventEmitter<number>();
  @Output() kpiChange       = new EventEmitter<string>();
  @Output() styleChange     = new EventEmitter<string>();

  readonly KPI_OPTIONS = KPI_OPTIONS;
  readonly MAP_STYLES  = MAP_STYLES;
  showStylePicker = false;

  getSelectedStyle(): MapStyle {
    return MAP_STYLES.find(s => s.id === this.selectedStyleId) ?? MAP_STYLES[0];
  }
}
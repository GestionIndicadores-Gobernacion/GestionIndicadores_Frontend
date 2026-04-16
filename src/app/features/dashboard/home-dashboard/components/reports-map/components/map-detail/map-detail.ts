// components/map-detail/map-detail.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { KpiOption, MunicipioSummary } from '../../reports-map.types';

@Component({
  selector: 'app-map-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './map-detail.html',
})
export class MapDetailComponent {

  isViewer = false;

  constructor() {
    const user = JSON.parse(localStorage.getItem('user') ?? 'null');
    this.isViewer = user?.role?.name === 'viewer';
  }

  @Input() municipio!: MunicipioSummary;
  @Output() close = new EventEmitter<void>();
  @Input() activeKpi: KpiOption | null = null;
  @Input() selectedKpiId = '';

  getKpiValue(): number {
    if (!this.selectedKpiId) return this.municipio.totalReports;
    const map: Record<string, number> = {
      asistencias: this.municipio.indicators.find(i => i.id === -1)?.total ?? 0,
      denuncias:   this.municipio.indicators.find(i => i.id === -2)?.total ?? 0,
      esterilizados: this.municipio.indicators.find(i => i.id === -3)?.total ?? 0,
      refugios:    this.municipio.indicators.find(i => i.id === -4)?.total ?? 0,
      ninos:       this.municipio.indicators.find(i => i.id === -5)?.total ?? 0,
      emprendedores: this.municipio.indicators.find(i => i.id === -6)?.total ?? 0,
    };
    return map[this.selectedKpiId] ?? 0;
  }
}
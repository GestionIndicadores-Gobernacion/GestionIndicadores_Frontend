// components/map-detail/map-detail.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KpiOption, MunicipioSummary } from '../../reports-map.types';

@Component({
  selector: 'app-map-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-detail.html',
})
export class MapDetailComponent {
  @Input() municipio!: MunicipioSummary;
  @Input() activeKpi!: KpiOption;
  @Output() close = new EventEmitter<void>();

  activeTab: 'indicators' | 'overview' | 'reports' = 'indicators';
  expandedReportId: number | null = null;

  getKpiValue(): number {
    const map: Record<string, number> = {
      asistencias: this.municipio.indicators.find(i => i.id === -1)?.total ?? 0,
      denuncias: this.municipio.indicators.find(i => i.id === -2)?.total ?? 0,
      esterilizados: this.municipio.indicators.find(i => i.id === -3)?.total ?? 0,
      refugios: this.municipio.indicators.find(i => i.id === -4)?.total ?? 0,
      ninos: this.municipio.indicators.find(i => i.id === -5)?.total ?? 0,
      emprendedores: this.municipio.indicators.find(i => i.id === -6)?.total ?? 0,
    };
    return map[this.activeKpi.id] ?? 0;
  }

  toggleReport(id: number): void {
    this.expandedReportId = this.expandedReportId === id ? null : id;
  }
}
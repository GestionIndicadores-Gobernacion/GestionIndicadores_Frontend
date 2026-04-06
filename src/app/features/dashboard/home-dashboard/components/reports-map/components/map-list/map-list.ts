// components/map-list/map-list.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KpiOption, MunicipioSummary } from '../../reports-map.types';

@Component({
  selector: 'app-map-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-list.html',
})
export class MapListComponent {
  @Input() municipios: MunicipioSummary[] = [];
  @Input() selectedMunicipio: MunicipioSummary | null = null;
  @Input() activeKpi: KpiOption | null = null;
  @Input() selectedKpiId = '';

  @Output() municipioSelect = new EventEmitter<MunicipioSummary>();

  getKpiValue(m: MunicipioSummary): number {
    if (!this.selectedKpiId) return m.totalReports;
    const map: Record<string, number> = {
      asistencias: m.indicators.find(i => i.id === -1)?.total ?? 0,
      denuncias: m.indicators.find(i => i.id === -2)?.total ?? 0,
      esterilizados: m.indicators.find(i => i.id === -3)?.total ?? 0,
      refugios: m.indicators.find(i => i.id === -4)?.total ?? 0,
      ninos: m.indicators.find(i => i.id === -5)?.total ?? 0,
      emprendedores: m.indicators.find(i => i.id === -6)?.total ?? 0,
    };
    return map[this.selectedKpiId] ?? 0;
  }

  getMaxKpiValue(): number {
    return Math.max(...this.municipios.map(m => this.getKpiValue(m)), 1);
  }

  getTotalKpiValue(): number {
    return this.municipios.reduce((s, m) => s + this.getKpiValue(m), 0);
  }
}
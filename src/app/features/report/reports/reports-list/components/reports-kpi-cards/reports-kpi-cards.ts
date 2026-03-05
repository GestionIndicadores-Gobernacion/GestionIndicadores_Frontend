import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReportModel } from '../../../../../../core/models/report.model';

// ─── IDs de indicadores relevantes ───────────────────────────────────────────
const ID_ASISTENCIAS_TECNICAS = 74;
const ID_DENUNCIAS_REPORTADAS = 31;
const ID_PERSONAS_CAPACITADAS = 76;
const ID_NINOS_SENSIBILIZADOS = 114;
const IDS_ANIMALES_ESTERILIZADOS = [99]; // matriz: value[cat][group].no_de_animales_esterilizados
const ID_REFUGIOS_IMPACTADOS = 60;
const ID_EMPRENDEDORES = 61;

@Component({
  selector: 'app-reports-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-kpi-cards.html',
  styleUrl: './reports-kpi-cards.css',
})
export class ReportsKpiCardsComponent {
  @Input() reports: ReportModel[] = [];

  @Input() selectedYear: number = new Date().getFullYear();
  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Suma simple de un indicador numérico directo en todos los reportes */
  private sumNumeric(indicatorId: number): number {
    let total = 0;
    for (const report of this.filteredReports) {  // ← cambio
      const iv = report.indicator_values?.find(i => i.indicator_id === indicatorId);
      if (iv?.value != null) {
        const n = Number(iv.value);
        if (!isNaN(n)) total += n;
      }
    }
    return total;
  }

  /**
   * Suma la key `no_de_animales_esterilizados` dentro de la estructura matricial:
   * value = { [categoria]: { [grupo]: { no_de_animales_esterilizados: number, ... } } }
   */
  private sumMatrixKey(indicatorIds: number[], metricKey: string): number {
    let total = 0;
    for (const report of this.reports) {
      for (const id of indicatorIds) {
        const iv = report.indicator_values?.find(i => i.indicator_id === id);
        if (!iv?.value || typeof iv.value !== 'object') continue;

        const matrix = iv.value as Record<string, Record<string, Record<string, number>>>;
        for (const category of Object.values(matrix)) {
          if (typeof category !== 'object') continue;
          for (const group of Object.values(category)) {
            if (typeof group !== 'object') continue;
            const val = group[metricKey];
            if (typeof val === 'number' && !isNaN(val)) total += val;
          }
        }
      }
    }
    return total;
  }


  private get filteredReports(): ReportModel[] {
    return this.reports.filter(r => {
      const year = new Date(r.report_date).getFullYear();
      return year === this.selectedYear;
    });
  }
  // ─── KPIs ──────────────────────────────────────────────────────────────────

  get asistenciasTecnicas(): number {
    return this.filteredReports.filter(r => r.component_id === 2).length;
  }

  get denunciasReportadas(): number {
    return this.sumNumeric(ID_DENUNCIAS_REPORTADAS);
  }

  get personasCapacitadas(): number {
    return this.sumNumeric(ID_PERSONAS_CAPACITADAS);
  }

  get ninosSensibilizados(): number {
    return this.sumNumeric(ID_NINOS_SENSIBILIZADOS);
  }

  get animalesEsterilizados(): number {
    const relevant = this.filteredReports.filter(
      r => r.strategy_id === 3 && (r.component_id === 8 || r.component_id === 9)
    );

    let total = 0;
    for (const report of relevant) {
      for (const id of IDS_ANIMALES_ESTERILIZADOS) {
        const iv = report.indicator_values?.find(i => i.indicator_id === id);
        if (!iv?.value || typeof iv.value !== 'object') continue;

        const raw = iv.value as Record<string, any>;
        const data = raw['data'];
        if (!data || typeof data !== 'object') continue;

        for (const category of Object.values(data)) {
          if (typeof category !== 'object') continue;
          for (const group of Object.values(category as Record<string, any>)) {
            if (typeof group !== 'object') continue;
            const val = (group as Record<string, any>)['no_de_animales_esterilizados'];
            if (typeof val === 'number' && !isNaN(val)) total += val;
          }
        }
      }
    }
    return total;
  }

  get refugiosImpactados(): number {
    const ID_ESPACIO_ATENDIDO = 102;
    const categorias = ['albergue/refugio', 'hogar de paso', 'espacio publico', 'fundacion'];

    return this.filteredReports.filter(r => {
      const iv = r.indicator_values?.find(i => i.indicator_id === ID_ESPACIO_ATENDIDO);
      if (!iv?.value) return false;
      const val = typeof iv.value === 'string' ? iv.value.toLowerCase() : '';
      return categorias.some(c => val.includes(c));
    }).length;
  }

  get emprendedoresCofinanciados(): number {
    return this.sumNumeric(ID_EMPRENDEDORES);
  }

  get lastReportDate(): Date | null {
    if (!this.reports.length) return null;
    const maxDate = Math.max(
      ...this.reports.map(r => new Date(r.created_at).getTime())
    );
    return new Date(maxDate);
  }


}
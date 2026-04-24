import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReportModel } from '../models/report.model';

// ─── Constantes de dominio ───────────────────────────────────────────────
// Solo quedan las que usan los agregadores de subset (consumidos por el
// mapa para calcular KPIs por municipio). El cálculo global por año
// vive en el backend (/kpis).
export const COMPONENT_ID_ASISTENCIAS = 2;
export const COMPONENT_ID_JUNTAS = 21;
export const COMPONENT_ID_EMPRENDEDORES = 14;
export const COMPONENT_ID_NINOS = 23;
export const COMPONENT_ID_ESTERILIZACION = 8;
export const STRATEGY_ID_ESTERILIZACION = 3;

export const ID_ASISTENCIAS_JUNTAS = 160;
export const ID_DENUNCIAS_REPORTADAS = 137;
export const ID_ANIMALES_ESTERILIZADOS = 99;
export const ID_REFUGIOS = 102;
export const ID_NINOS_CANTIDAD_IMPACTADA = 114;

const ESPACIOS_ACOGIDA = ['albergue/refugio', 'fundacion', 'hogar de paso'];

// ─── Contratos ───────────────────────────────────────────────────────────
export interface KpiSnapshot {
  asistenciasTecnicas: number;
  denunciasReportadas: number;
  personasCapacitadas: number;
  ninosSensibilizados: number;
  animalesEsterilizados: number;
  refugiosImpactados: number;
  emprendedoresCofinanciados: number;
}

/** Forma exacta que devuelve el backend en GET /kpis. */
interface KpiSnapshotApi {
  year: number;
  asistencias_tecnicas: number;
  denuncias_reportadas: number;
  personas_capacitadas: number;
  ninos_sensibilizados: number;
  animales_esterilizados: number;
  refugios_impactados: number;
  emprendedores_cofinanciados: number;
}

/** Forma de GET /kpis/by-location. */
export interface KpiLocationItem {
  location: string;
  total_reports: number;
  asistencias_tecnicas: number;
  denuncias_reportadas: number;
  animales_esterilizados: number;
  refugios_impactados: number;
  ninos_sensibilizados: number;
  emprendedores_cofinanciados: number;
}

export interface KpiByLocationResponse {
  year: number;
  items: KpiLocationItem[];
}


@Injectable({ providedIn: 'root' })
export class ReportsKpiService {

  private api = `${environment.apiUrl}/kpis`;

  constructor(private http: HttpClient) { }

  // =====================================================================
  // FUENTE CANÓNICA — endpoint /kpis del backend
  // =====================================================================

  /**
   * Devuelve el snapshot de KPIs calculado en el backend (fuente única).
   */
  getSnapshotRemote(year: number): Observable<KpiSnapshot> {
    const params = new HttpParams().set('year', String(year));
    return this.http
      .get<KpiSnapshotApi>(`${this.api}/`, { params })
      .pipe(map(ReportsKpiService.fromApi));
  }

  /**
   * KPIs agrupados por municipio. El mapa consume este endpoint en vez
   * de calcular los agregados en el frontend.
   */
  getByLocation(year: number): Observable<KpiByLocationResponse> {
    const params = new HttpParams().set('year', String(year));
    return this.http.get<KpiByLocationResponse>(
      `${this.api}/by-location`, { params }
    );
  }

  /** Adapta snake_case del backend al camelCase que ya usa la UI. */
  static fromApi(api: KpiSnapshotApi): KpiSnapshot {
    return {
      asistenciasTecnicas: api.asistencias_tecnicas,
      denunciasReportadas: api.denuncias_reportadas,
      personasCapacitadas: api.personas_capacitadas,
      ninosSensibilizados: api.ninos_sensibilizados,
      animalesEsterilizados: api.animales_esterilizados,
      refugiosImpactados: api.refugios_impactados,
      emprendedoresCofinanciados: api.emprendedores_cofinanciados,
    };
  }

  // =====================================================================
  // AGREGADORES DE SUBSET (consumidos por reports-map para KPIs por
  // municipio). NO son duplicación del endpoint: el endpoint devuelve
  // totales globales por año; estos métodos aplican la misma aritmética
  // a un subconjunto arbitrario de reportes (p. ej. los de un municipio).
  //
  // Si en el futuro se crea un endpoint /kpis/by-location, todo este
  // bloque se puede eliminar y el mapa pasaría a consumirlo.
  // =====================================================================

  filterByYear(reports: ReportModel[], year: number): ReportModel[] {
    const y = Number(year);
    return reports.filter(r => {
      const parts = (r.report_date as string).split('-');
      return parseInt(parts[0], 10) === y;
    });
  }

  asistenciasTecnicas(reports: ReportModel[]): number {
    let total = 0;
    for (const r of reports) {
      if (r.component_id === COMPONENT_ID_ASISTENCIAS) { total += 1; continue; }
      if (r.component_id === COMPONENT_ID_JUNTAS) {
        const iv = r.indicator_values?.find(i => i.indicator_id === ID_ASISTENCIAS_JUNTAS);
        if (iv?.value != null) { const n = Number(iv.value); if (!isNaN(n)) total += n; }
      }
    }
    return total;
  }

  denunciasReportadas(reports: ReportModel[]): number {
    return reports.reduce((sum, r) => {
      const iv = r.indicator_values?.find(i => i.indicator_id === ID_DENUNCIAS_REPORTADAS);
      if (iv?.value == null) return sum;
      const n = Number(iv.value);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }

  animalesEsterilizados(reports: ReportModel[]): number {
    return reports
      .filter(r => r.strategy_id === STRATEGY_ID_ESTERILIZACION && r.component_id === COMPONENT_ID_ESTERILIZACION)
      .reduce((sum, r) => {
        const iv = r.indicator_values?.find(i => i.indicator_id === ID_ANIMALES_ESTERILIZADOS);
        if (!iv?.value || typeof iv.value !== 'object') return sum;
        const data = (iv.value as Record<string, unknown>)['data'];
        if (!data || typeof data !== 'object') return sum;
        let s = 0;
        for (const especie of Object.values(data as Record<string, unknown>)) {
          if (!especie || typeof especie !== 'object') continue;
          for (const sexo of Object.values(especie as Record<string, unknown>)) {
            if (!sexo || typeof sexo !== 'object') continue;
            const val = (sexo as Record<string, unknown>)['no_de_animales_esterilizados'];
            if (typeof val === 'number' && !isNaN(val)) s += val;
          }
        }
        return sum + s;
      }, 0);
  }

  refugiosImpactados(reports: ReportModel[]): number {
    return reports.filter(r => {
      const iv = r.indicator_values?.find(i => i.indicator_id === ID_REFUGIOS);
      if (!iv?.value) return false;
      const val = typeof iv.value === 'string' ? iv.value.toLowerCase().trim() : '';
      return ESPACIOS_ACOGIDA.includes(val);
    }).length;
  }

  ninosSensibilizados(reports: ReportModel[]): number {
    return reports
      .filter(r => r.component_id === COMPONENT_ID_NINOS)
      .reduce((sum, r) => {
        const iv = r.indicator_values?.find(i => i.indicator_id === ID_NINOS_CANTIDAD_IMPACTADA);
        if (iv?.value == null) return sum;
        const n = Number(iv.value);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
  }

  emprendedoresCofinanciados(reports: ReportModel[]): number {
    return reports.filter(r => r.component_id === COMPONENT_ID_EMPRENDEDORES).length;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

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


/**
 * Fuente única de KPIs: el backend. Este servicio SOLO habla HTTP;
 * no hay agregadores locales ni fallback — lo que antes vivía aquí fue
 * migrado a `ReportKpiService` (Python) y expuesto por /kpis y
 * /kpis/by-location.
 */
@Injectable({ providedIn: 'root' })
export class ReportsKpiService {

  private api = `${environment.apiUrl}/kpis`;

  constructor(private http: HttpClient) { }

  /**
   * Snapshot global. Si llega rango (`dateFrom`+`dateTo`) los reportes se
   * filtran por ese rango y `year` se conserva para los cálculos que
   * dependen del año (p.ej. `personas_capacitadas` del dataset externo).
   */
  getSnapshotRemote(year: number, dateFrom?: string | null, dateTo?: string | null): Observable<KpiSnapshot> {
    let params = new HttpParams().set('year', String(year));
    if (dateFrom && dateTo) {
      params = params.set('date_from', dateFrom).set('date_to', dateTo);
    }
    return this.http
      .get<KpiSnapshotApi>(`${this.api}/`, { params })
      .pipe(map(ReportsKpiService.fromApi));
  }

  /** KPIs agrupados por municipio. Consumido por el mapa del dashboard. */
  getByLocation(year: number, dateFrom?: string | null, dateTo?: string | null): Observable<KpiByLocationResponse> {
    let params = new HttpParams().set('year', String(year));
    if (dateFrom && dateTo) {
      params = params.set('date_from', dateFrom).set('date_to', dateTo);
    }
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
}

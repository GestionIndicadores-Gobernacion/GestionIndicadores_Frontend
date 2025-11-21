import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private api = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // 1. Obtener todos los registros
  private getRecords() {
    return this.http.get<any[]>(`${this.api}/records`);
  }

  // 2. Obtener indicadores
  private getIndicators() {
    return this.http.get<any[]>(`${this.api}/indicators`);
  }

  // 3. Obtener componentes estratégicos
  private getComponents() {
    return this.http.get<any[]>(`${this.api}/components`);
  }

  /**
   * Devuelve las 5 KPIs principales del dashboard
   * {
   *   totalRegistros,
   *   registrosMes,
   *   municipiosActivos,
   *   indicadoresActivos,
   *   componentesActivos
   * }
   */
  getKPIs(): Observable<any> {
    return forkJoin([
      this.getRecords(),
      this.getIndicators(),
      this.getComponents()
    ]).pipe(
      map(([records, indicators, components]) => {

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // 1 Total registros
        const totalRegistros = records.length;

        // 2Registros del mes actual
        const registrosMes = records.filter(r => {
          const fecha = new Date(r.fecha);
          return fecha.getMonth() === currentMonth &&
            fecha.getFullYear() === currentYear;
        }).length;

        // 3 Municipios activos (set)
        const municipiosActivos =
          new Set(records.map(r => r.municipio)).size;

        // 4 Indicadores activos
        const indicadoresActivos = indicators.length;

        // 5 Componentes activos
        const componentesActivos = components.length;

        return {
          totalRegistros,
          registrosMes,
          municipiosActivos,
          indicadoresActivos,
          componentesActivos
        };
      })
    );
  }

  // 6 Registros por municipio
  getRecordsByMunicipio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/records/stats/municipios`);
  }

  // 7 Registros por mes (YYYY-MM)
  getRecordsByMes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/records/stats/mes`);
  }

  // 8 Tipos de población
  getRecordsByTipoPoblacion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/records/stats/tipo-poblacion`);
  }

  // 9 Últimos registros creados
  getLatestRecords(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/records/latest?limit=${limit}`);
  }
}

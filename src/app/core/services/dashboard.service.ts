import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  RecordModel,
  RecordStatsMes,
  RecordStatsMunicipio
} from '../models/record.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private api = `${environment.apiUrl}/record`;
  private compsApi = `${environment.apiUrl}/component`;
  private indsApi = `${environment.apiUrl}/indicator`;

  constructor(private http: HttpClient) { }

  // ======================
  // 📌 1. ESTADÍSTICAS
  // ======================

  getRecordsByMunicipio() {
    return this.http.get<RecordStatsMunicipio[]>(`${this.api}/stats/municipios`);
  }

  getRecordsByMes() {
    return this.http.get<RecordStatsMes[]>(`${this.api}/stats/mes`);
  }

  getLatestRecords(limit = 5) {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<RecordModel[]>(`${this.api}/latest`, { params });
  }

  getRecordsByEstrategia() {
    return this.http.get<any[]>(`${this.api}/stats/estrategias`);
  }

  getRecordsByComponent(estrategiaId?: number) {
    let params = new HttpParams();

    if (estrategiaId) {
      params = params.set('estrategia_id', estrategiaId);
    }

    return this.http.get<any[]>(`${this.api}/stats/componentes`, { params });
  }


  // ======================
  // 📌 2. KPIs
  // ======================
  getKPIs(): Observable<any> {
    return this.http.get(`${this.api}/stats/count`);
  }

  getYears() {
    return this.http.get<number[]>(`${this.api}/years`);
  }

  getAvanceIndicadores(year?: number, estrategiaId?: number, componenteId?: number) {
    let params = new HttpParams();

    if (year) params = params.set('year', year);
    if (estrategiaId) params = params.set('estrategia_id', estrategiaId);
    if (componenteId) params = params.set('component_id', componenteId);

    return this.http.get<any[]>(`${this.api}/stats/avance_indicadores`, { params });
  }

}

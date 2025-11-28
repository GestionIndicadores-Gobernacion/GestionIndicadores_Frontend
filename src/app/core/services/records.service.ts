// core/services/records.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';

import {
  RecordCreateRequest,
  RecordUpdateRequest,
  RecordModel,
  RecordFilterParams,
  RecordStatsMunicipio,
  RecordStatsMes,
  RecordStatsTipoPoblacion
} from '../models/record.model';

@Injectable({
  providedIn: 'root',
})
export class RecordsService {

  private api = `${environment.apiUrl}/record`;

  constructor(private http: HttpClient) {}

  // =====================================================
  // GET LIST (con filtros opcionales)
  // =====================================================
  getAll(filters?: RecordFilterParams) {
    let params = new HttpParams();

    if (filters) {
      if (filters.municipio) params = params.set('municipio', filters.municipio);
      if (filters.component_id) params = params.set('component_id', filters.component_id.toString());
      if (filters.indicator_id) params = params.set('indicator_id', filters.indicator_id.toString());
      if (filters.fecha_from) params = params.set('fecha_from', filters.fecha_from);
      if (filters.fecha_to) params = params.set('fecha_to', filters.fecha_to);
    }

    return this.http.get<RecordModel[]>(this.api, { params });
  }

  // =====================================================
  // GET BY ID
  // =====================================================
  getById(id: number) {
    return this.http.get<RecordModel>(`${this.api}/${id}`);
  }

  // =====================================================
  // CREATE
  // =====================================================
  create(body: RecordCreateRequest) {

    const parsed = {
      ...body,
      // 🔥 el backend recibe tipo_poblacion como JSON (lista), NO como string
    };

    return this.http.post<RecordModel>(this.api, parsed);
  }

  // =====================================================
  // UPDATE
  // =====================================================
  update(id: number, body: RecordUpdateRequest) {

    const parsed = {
      ...body,
      
    };

    return this.http.put<RecordModel>(`${this.api}/${id}`, parsed);
  }

  // =====================================================
  // DELETE
  // =====================================================
  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  // =====================================================
  // DASHBOARD STATS
  // =====================================================
  getStatsMunicipios() {
    return this.http.get<RecordStatsMunicipio[]>(`${this.api}/stats/municipios`);
  }

  getStatsMes() {
    return this.http.get<RecordStatsMes[]>(`${this.api}/stats/mes`);
  }

  getStatsTipoPoblacion() {
    return this.http.get<RecordStatsTipoPoblacion[]>(`${this.api}/stats/tipo-poblacion`);
  }

  getLatest(limit = 5) {
    return this.http.get<RecordModel[]>(`${this.api}/latest`, {
      params: { limit }
    });
  }
}

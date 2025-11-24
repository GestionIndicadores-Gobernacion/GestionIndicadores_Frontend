import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { RecordCreateRequest, RecordFilterParams, RecordModel, RecordStatsMes, RecordStatsMunicipio, RecordStatsTipoPoblacion, RecordUpdateRequest } from '../models/record.model';

@Injectable({
  providedIn: 'root',
})
export class RecordsService {
  private api = `${environment.apiUrl}/records`;

  constructor(private http: HttpClient) { }

  // Listado con filtros opcionales
  getAll(filters?: RecordFilterParams) {
    let params = new HttpParams();

    if (filters) {
      if (filters.municipio) {
        params = params.set('municipio', filters.municipio);
      }
      if (filters.component_id !== undefined) {
        params = params.set('component_id', filters.component_id.toString());
      }
      if (filters.indicator_id !== undefined) {
        params = params.set('indicator_id', filters.indicator_id.toString());
      }
      if (filters.tipo_poblacion) {
        params = params.set('tipo_poblacion', filters.tipo_poblacion);
      }
      if (filters.fecha_from) {
        params = params.set('fecha_from', filters.fecha_from);
      }
      if (filters.fecha_to) {
        params = params.set('fecha_to', filters.fecha_to);
      }
    }

    return this.http.get<RecordModel[]>(this.api, { params });
  }

  getById(id: number) {
    return this.http.get<RecordModel>(`${this.api}/${id}`);
  }

  create(body: RecordCreateRequest) {
    return this.http.post<RecordModel>(this.api, body);
  }

  update(id: number, body: RecordUpdateRequest | RecordCreateRequest) {
    return this.http.put<RecordModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  // --------- STATS para dashboard ---------

  getStatsMunicipios() {
    return this.http.get<RecordStatsMunicipio[]>(`${this.api}/stats/municipios`);
  }

  getStatsMes() {
    return this.http.get<RecordStatsMes[]>(`${this.api}/stats/mes`);
  }

  getStatsTipoPoblacion() {
    return this.http.get<RecordStatsTipoPoblacion[]>(`${this.api}/stats/tipo-poblacion`);
  }

  // Últimos registros para widgets
  getLatest(limit = 5) {
    return this.http.get<RecordModel[]>(`${this.api}/latest`, {
      params: { limit },
    });
  }
}

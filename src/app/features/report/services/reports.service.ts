import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

import {
  ReportModel,
  ReportCreateRequest,
  ReportUpdateRequest
} from '../models/report.model';

import {
  StrategyAggregate,
  ComponentAggregate,
  ComponentIndicatorsAggregate
} from '../models/report-aggregate.model';
import { Observable } from 'rxjs';

/** Envelope estándar de respuestas paginadas del backend. */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {

  private api = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) { }

  /** Sin paginación → backend devuelve la lista completa (legacy). */
  getAll() {
    return this.http.get<ReportModel[]>(this.api);
  }

  /**
   * Paginado: el backend devuelve `{ items, total, limit, offset }`.
   * Útil para tablas grandes; conviene usarlo en pantallas con miles
   * de reportes para evitar payloads pesados.
   */
  getPaginated(limit = 50, offset = 0): Observable<Paginated<ReportModel>> {
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));
    return this.http.get<Paginated<ReportModel>>(this.api, { params });
  }

  getAllForDashboard(): Observable<ReportModel[]> {
    return this.http.get<ReportModel[]>(`${this.api}/all`);
  }

  getById(id: number) {
    return this.http.get<ReportModel>(`${this.api}/${id}`);
  }

  create(body: ReportCreateRequest) {
    return this.http.post<ReportModel>(this.api, body);
  }

  update(id: number, body: ReportUpdateRequest) {
    return this.http.put<ReportModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  aggregateByStrategy(strategyId: number) {
    return this.http.get<StrategyAggregate>(
      `${this.api}/aggregate/strategy/${strategyId}`
    );
  }

  aggregateByComponent(
    componentId: number,
    year?: number,
    dateFrom?: string,
    dateTo?: string
  ): Observable<ComponentAggregate> {
    let params = '';
    if (dateFrom && dateTo) {
      params = `?date_from=${dateFrom}&date_to=${dateTo}`;
    } else if (year) {
      params = `?year=${year}`;
    }
    return this.http.get<ComponentAggregate>(
      `${this.api}/aggregate/component/${componentId}${params}`
    );
  }

  aggregateIndicatorsByComponent(
    componentId: number,
    year?: number,
    dateFrom?: string,
    dateTo?: string
  ): Observable<ComponentIndicatorsAggregate> {
    let params = '';
    if (dateFrom && dateTo) {
      params = `?date_from=${dateFrom}&date_to=${dateTo}`;
    } else if (year) {
      params = `?year=${year}`;
    }
    return this.http.get<ComponentIndicatorsAggregate>(
      `${this.api}/aggregate/component/${componentId}/indicators${params}`
    );
  }

  linkActivity(reportId: number, activityId: number): Observable<ReportModel> {
    return this.http.post<ReportModel>(
      `${this.api}/${reportId}/link-activity/${activityId}`, {}
    );
  }
}
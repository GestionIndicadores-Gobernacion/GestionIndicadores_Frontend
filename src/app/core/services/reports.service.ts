import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

import {
  ReportModel,
  ReportCreateRequest,
  ReportUpdateRequest
} from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {

  private api = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) { }

  // =====================================================
  // GET ALL
  // =====================================================
  getAll() {
    return this.http.get<ReportModel[]>(this.api);
  }

  // =====================================================
  // GET BY ID
  // =====================================================
  getById(id: number) {
    return this.http.get<ReportModel>(`${this.api}/${id}`);
  }

  // =====================================================
  // CREATE
  // =====================================================
  create(body: ReportCreateRequest) {
    return this.http.post<ReportModel>(this.api, body);
  }

  // =====================================================
  // UPDATE
  // =====================================================
  update(id: number, body: ReportUpdateRequest) {
    return this.http.put<ReportModel>(`${this.api}/${id}`, body);
  }

  // =====================================================
  // DELETE
  // =====================================================
  delete(id: number) {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // =====================================================
  // AGGREGATES
  // =====================================================
  aggregateByComponent(componentId: number) {
    return this.http.get(
      `${this.api}/aggregate/component/${componentId}`
    );
  }

  aggregateByStrategy(strategyId: number) {
    return this.http.get(
      `${this.api}/aggregate/strategy/${strategyId}`
    );
  }
}

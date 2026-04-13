// features/report/services/strategies.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import {
  StrategyModel,
  StrategyCreateRequest,
  StrategyUpdateRequest
} from '../models/strategy.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StrategiesService {

  private api = `${environment.apiUrl}/strategies`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<StrategyModel[]>(this.api);
  }

  getDashboard(year?: number, dateFrom?: string, dateTo?: string): Observable<StrategyModel[]> {
    let params = new HttpParams();
    if (dateFrom && dateTo) {
      params = params.set('date_from', dateFrom).set('date_to', dateTo);
    } else if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<StrategyModel[]>(`${this.api}/dashboard`, { params });
  }

  getById(id: number) {
    return this.http.get<StrategyModel>(`${this.api}/${id}`);
  }

  getProgress(id: number) {
    return this.http.get<StrategyModel>(`${this.api}/${id}/progress`);
  }

  create(body: StrategyCreateRequest) {
    return this.http.post<StrategyModel>(this.api, body);
  }

  update(id: number, body: StrategyUpdateRequest) {
    return this.http.put<StrategyModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
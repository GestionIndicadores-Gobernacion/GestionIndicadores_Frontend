// core/services/strategies.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import {
  StrategyModel,
  StrategyCreateRequest,
  StrategyUpdateRequest
} from '../models/strategy.model';

@Injectable({
  providedIn: 'root',
})
export class StrategiesService {

  private api = `${environment.apiUrl}/strategies`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<StrategyModel[]>(this.api);
  }
  
  getDashboard(year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.http.get<StrategyModel[]>(`${this.api}/dashboard${params}`);
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
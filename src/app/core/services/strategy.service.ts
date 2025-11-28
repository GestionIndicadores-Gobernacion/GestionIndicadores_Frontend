// core/services/strategies.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { 
  StrategyModel, 
  StrategyCreateRequest, 
  StrategyUpdateRequest 
} from '../models/strategy.model';

@Injectable({
  providedIn: 'root',
})
export class StrategiesService {

  private api = `${environment.apiUrl}/strategy`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<StrategyModel[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<StrategyModel>(`${this.api}/${id}`);
  }

  create(body: StrategyCreateRequest) {
    return this.http.post<StrategyModel>(this.api, body);
  }

  update(id: number, body: StrategyUpdateRequest) {
    return this.http.put<StrategyModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}

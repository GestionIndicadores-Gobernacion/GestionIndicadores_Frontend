import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { IndicatorModel, IndicatorCreateRequest, IndicatorUpdateRequest } from '../models/indicator.model';

@Injectable({
  providedIn: 'root',
})
export class IndicatorsService {
  private api = `${environment.apiUrl}/indicators`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<IndicatorModel[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<IndicatorModel>(`${this.api}/${id}`);
  }

  create(body: IndicatorCreateRequest) {
    return this.http.post<IndicatorModel>(this.api, body);
  }

  update(id: number, body: IndicatorUpdateRequest) {
    return this.http.put<IndicatorModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}

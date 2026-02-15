import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  ComponentModel,
  ComponentDetailResponse,
  ComponentCreateRequest,
  ComponentUpdateRequest
} from '../models/component.model';

@Injectable({
  providedIn: 'root'
})
export class ComponentsService {

  private api = `${environment.apiUrl}/components`;

  constructor(private http: HttpClient) { }

  /* =========================
     Básicos
  ========================= */

  getAll(): Observable<ComponentModel[]> {
    return this.http.get<ComponentModel[]>(this.api);
  }

  getById(id: number): Observable<ComponentDetailResponse> {
    return this.http.get<ComponentDetailResponse>(`${this.api}/${id}`);
  }

  getByStrategy(strategyId: number): Observable<ComponentModel[]> {
    return this.http.get<ComponentModel[]>(
      `${this.api}/by-strategy/${strategyId}`
    );
  }

  create(body: ComponentCreateRequest): Observable<ComponentModel> {
    return this.http.post<ComponentModel>(this.api, body);
  }

  update(id: number, body: ComponentUpdateRequest): Observable<ComponentModel> {
    return this.http.put<ComponentModel>(`${this.api}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}

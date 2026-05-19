import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  /**
   * Listado ultra-liviano: `[{ id, name }]`. Para reports-list y otros
   * consumidores que solo necesitan poblar mapas id→nombre. Evita los
   * N+1 de `objectives`, `mga_activities`, `indicators(+targets)` y los
   * selectin de `public_policies` / `user_assignments` que dispara
   * `ComponentSchema`.
   */
  getSummary(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(`${this.api}/summary`);
  }

  getById(id: number): Observable<ComponentDetailResponse> {
    return this.http.get<ComponentDetailResponse>(`${this.api}/${id}`);
  }

  getByStrategy(strategyId: number): Observable<ComponentModel[]> {
    return this.http.get<ComponentModel[]>(
      `${this.api}/by-strategy/${strategyId}`
    );
  }

  create(body: ComponentCreateRequest): Observable<ComponentDetailResponse> {
    return this.http.post<ComponentDetailResponse>(this.api, body);
  }

  update(id: number, body: ComponentUpdateRequest): Observable<ComponentDetailResponse> {
    return this.http.put<ComponentDetailResponse>(`${this.api}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
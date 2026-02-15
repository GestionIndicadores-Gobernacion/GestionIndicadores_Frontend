import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Table, TablePayload } from '../models/table.model';

@Injectable({
  providedIn: 'root'
})
export class TableService {

  private readonly baseUrl = `${environment.apiUrl}/tables`;

  constructor(private http: HttpClient) { }

  // =========================
  // LISTAR TODAS
  // =========================
  getAll(): Observable<Table[]> {
    return this.http.get<Table[]>(this.baseUrl);
  }

  // =========================
  // DETALLE
  // =========================
  getById(tableId: number): Observable<Table> {
    return this.http.get<Table>(
      `${this.baseUrl}/${tableId}`
    );
  }

  // =========================
  // CREAR
  // =========================
  create(payload: TablePayload & { dataset_id: number }): Observable<Table> {
    return this.http.post<Table>(
      this.baseUrl,
      payload
    );
  }

  // =========================
  // ACTUALIZAR (PUT parcial)
  // =========================
  update(
    tableId: number,
    payload: Partial<TablePayload>
  ): Observable<Table> {
    return this.http.put<Table>(
      `${this.baseUrl}/${tableId}`,
      payload
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}

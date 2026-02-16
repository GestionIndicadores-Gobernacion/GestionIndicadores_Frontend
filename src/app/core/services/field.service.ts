import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Field, FieldPayload } from '../models/field.model';

@Injectable({
  providedIn: 'root'
})
export class FieldService {

  private readonly baseUrl = `${environment.apiUrl}/fields`;

  constructor(private http: HttpClient) { }

  // =========================
  // LISTAR TODOS
  // =========================

  getAll(): Observable<Field[]> {
    return this.http.get<Field[]>(this.baseUrl);
  }

  // =========================
  // LISTAR POR TABLA
  // =========================
  getByTable(tableId: number): Observable<Field[]> {
    return this.http.get<Field[]>(this.baseUrl, {
      params: new HttpParams().set('table_id', tableId)
    });
  }

  // =========================
  // DETALLE
  // =========================
  getById(fieldId: number): Observable<Field> {
    return this.http.get<Field>(
      `${this.baseUrl}/${fieldId}`
    );
  }

  // =========================
  // CREAR
  // =========================
  create(payload: FieldPayload): Observable<Field> {
    return this.http.post<Field>(
      this.baseUrl,
      payload
    );
  }

  // =========================
  // ACTUALIZAR (PUT parcial)
  // =========================
  update(
    fieldId: number,
    payload: Partial<FieldPayload>
  ): Observable<Field> {
    return this.http.put<Field>(
      `${this.baseUrl}/${fieldId}`,
      payload
    );
  }

  // =========================
  // ELIMINAR
  // =========================
  delete(fieldId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${fieldId}`
    );
  }
}

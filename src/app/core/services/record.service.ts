import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  TableRecord,
  TableRecordPayload
} from '../models/record.model';

@Injectable({
  providedIn: 'root'
})
export class RecordService {

  private readonly baseUrl = `${environment.apiUrl}/records`;

  constructor(private http: HttpClient) { }

  // =========================
  // LISTAR RECORDS
  // =========================
  getAll(tableId: number): Observable<TableRecord[]> {
    const params = new HttpParams().set(
      'table_id',
      tableId.toString()
    );

    return this.http.get<TableRecord[]>(
      this.baseUrl,
      { params }
    );
  }

  // =========================
  // OBTENER UNO
  // =========================
  getById(recordId: number): Observable<TableRecord> {
    return this.http.get<TableRecord>(
      `${this.baseUrl}/${recordId}`
    );
  }

  // =========================
  // CREAR
  // =========================
  create(
    payload: TableRecordPayload
  ): Observable<TableRecord> {
    return this.http.post<TableRecord>(
      this.baseUrl,
      payload
    );
  }

  // =========================
  // ACTUALIZAR DATA
  // =========================
  update(
    recordId: number,
    data: { [key: string]: any }
  ): Observable<TableRecord> {
    return this.http.put<TableRecord>(
      `${this.baseUrl}/${recordId}`,
      { data }
    );
  }

  // =========================
  // ELIMINAR
  // =========================
  delete(recordId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${recordId}`
    );
  }
}

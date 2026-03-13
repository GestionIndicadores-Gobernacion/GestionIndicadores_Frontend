import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Dataset, DatasetImportPreview, DatasetImportResult } from '../models/dataset.model';
import { Field } from '../models/field.model';
import { DashboardData } from '../../features/datasets/table-viewer/table-viewer';

export interface ViewerData {
  table: {
    id: number;
    name: string;
    description: string;
    dataset_id: number;
  };
  fields: Field[];
  records: { id: number; data: Record<string, any> }[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatasetService {

  private readonly baseUrl = `${environment.apiUrl}/datasets`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Dataset[]> {
    return this.http.get<Dataset[]>(this.baseUrl);
  }

  getById(id: number): Observable<Dataset> {
    return this.http.get<Dataset>(`${this.baseUrl}/${id}`);
  }

  create(payload: { name: string; description?: string }): Observable<Dataset> {
    return this.http.post<Dataset>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<{ name: string; description: string }>): Observable<Dataset> {
    return this.http.put<Dataset>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  importFromExcel(file: File, datasetName?: string): Observable<DatasetImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (datasetName) formData.append('dataset_name', datasetName);
    return this.http.post<DatasetImportResult>(`${this.baseUrl}/import-excel`, formData);
  }

  previewImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ preview: DatasetImportPreview[] }>(
      `${this.baseUrl}/import-excel/preview`,
      formData
    );
  }

  getTableRecords(datasetId: number, tableId: number): Observable<{ id: number; data: Record<string, any> }[]> {
    return this.http.get<{ id: number; data: Record<string, any> }[]>(
      `${this.baseUrl}/${datasetId}/tables/${tableId}/records`
    );
  }

  getTableViewer(tableId: number): Observable<ViewerData> {
    return this.http.get<ViewerData>(`${this.baseUrl}/tables/${tableId}/viewer`);
  }

  getTableDashboard(tableId: number): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/tables/${tableId}/dashboard`);
  }

  /**
   * Devuelve todos los records de todas las tablas activas del dataset.
   * Usado por indicadores dataset_select / dataset_multi_select
   * para mostrar las opciones al reportar.
   * Endpoint: GET /datasets/:id/records
   */
  getRecordsByDataset(datasetId: number): Observable<{ id: number; data: Record<string, any> }[]> {
    return this.http.get<{ id: number; data: Record<string, any> }[]>(
      `${this.baseUrl}/${datasetId}/records`
    );
  }
}
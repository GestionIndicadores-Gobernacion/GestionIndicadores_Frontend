import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Dataset, DatasetImportPreview, DatasetImportResult } from '../models/dataset.model';


@Injectable({
  providedIn: 'root'
})
export class DatasetService {

  private readonly baseUrl = `${environment.apiUrl}/datasets`;

  constructor(private http: HttpClient) { }

  // =========================
  // LISTAR DATASETS
  // =========================
  getAll(): Observable<Dataset[]> {
    return this.http.get<Dataset[]>(this.baseUrl);
  }

  // =========================
  // DETALLE
  // =========================
  getById(id: number): Observable<Dataset> {
    return this.http.get<Dataset>(
      `${this.baseUrl}/${id}`
    );
  }

  // =========================
  // CREAR
  // =========================
  create(payload: {
    name: string;
    description?: string;
  }): Observable<Dataset> {
    return this.http.post<Dataset>(
      this.baseUrl,
      payload
    );
  }

  // =========================
  // ACTUALIZAR (PUT parcial)
  // =========================
  update(
    id: number,
    payload: Partial<{
      name: string;
      description: string;
    }>
  ): Observable<Dataset> {
    return this.http.put<Dataset>(
      `${this.baseUrl}/${id}`,
      payload
    );
  }

  // =========================
  // DESACTIVAR (soft delete)
  // =========================
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`
    );
  }

  // =========================
  // IMPORTAR DESDE EXCEL
  // =========================
  importFromExcel(
    file: File,
    datasetName?: string
  ): Observable<DatasetImportResult> {

    const formData = new FormData();
    formData.append('file', file);

    if (datasetName) {
      formData.append('dataset_name', datasetName);
    }

    return this.http.post<DatasetImportResult>(
      `${this.baseUrl}/import-excel`,
      formData
    );
  }

  previewImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{
      preview: DatasetImportPreview[];
    }>(`${this.baseUrl}/import-excel/preview`, formData);
  }

}

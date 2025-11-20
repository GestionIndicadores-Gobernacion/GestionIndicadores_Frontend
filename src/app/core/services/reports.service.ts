import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { ReportModel, ReportCreateRequest, ReportUpdateRequest } from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private api = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<ReportModel[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<ReportModel>(`${this.api}/${id}`);
  }

  create(body: ReportCreateRequest) {
    return this.http.post<ReportModel>(this.api, body);
  }

  update(id: number, body: ReportUpdateRequest) {
    return this.http.put<ReportModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}

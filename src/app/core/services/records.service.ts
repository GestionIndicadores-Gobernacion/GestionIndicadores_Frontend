import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { RecordModel, RecordCreateRequest, RecordUpdateRequest } from '../models/record.model';

@Injectable({
  providedIn: 'root',
})
export class RecordsService {
  private api = `${environment.apiUrl}/records`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<RecordModel[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<RecordModel>(`${this.api}/${id}`);
  }

  create(body: RecordCreateRequest) {
    return this.http.post<RecordModel>(this.api, body);
  }

  update(id: number, body: RecordUpdateRequest) {
    return this.http.put<RecordModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}

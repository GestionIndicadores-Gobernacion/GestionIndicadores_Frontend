// core/services/components.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ComponentModel,
  ComponentCreateRequest,
  ComponentUpdateRequest
} from '../models/component.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ComponentsService {

  private api = `${environment.apiUrl}/component`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<ComponentModel[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<ComponentModel>(`${this.api}/${id}`);
  }

  create(body: ComponentCreateRequest) {
    return this.http.post<ComponentModel>(this.api, body);
  }

  update(id: number, body: ComponentUpdateRequest) {
    return this.http.put<ComponentModel>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }

  getByActivity(activityId: number): Observable<ComponentModel[]> {
    return this.http.get<ComponentModel[]>(
      `${this.api}/by_activity/${activityId}`
    );
  }

}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLogModel } from '../models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private api = `${environment.apiUrl}/audit-logs`;

  constructor(private http: HttpClient) { }

  getAll(filters?: { entity?: string; entity_id?: number; user_id?: number }): Observable<AuditLogModel[]> {
    let params = new HttpParams();
    if (filters?.entity) params = params.set('entity', filters.entity);
    if (filters?.entity_id) params = params.set('entity_id', filters.entity_id);
    if (filters?.user_id) params = params.set('user_id', filters.user_id);
    return this.http.get<AuditLogModel[]>(this.api, { params });
  }
}

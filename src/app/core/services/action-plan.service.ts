import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActionPlanActivityModel,
  ActionPlanCreateRequest,
  ActionPlanFilters,
  ActionPlanModel,
  ActionPlanReportRequest,
} from '../models/action-plan.model';

@Injectable({ providedIn: 'root' })
export class ActionPlanService {

  private api = `${environment.apiUrl}/action-plans`;

  constructor(private http: HttpClient) { }

  getAll(filters?: ActionPlanFilters): Observable<ActionPlanModel[]> {
    let params = new HttpParams();
    if (filters?.strategy_id) params = params.set('strategy_id', filters.strategy_id);
    if (filters?.component_id) params = params.set('component_id', filters.component_id);
    if (filters?.month) params = params.set('month', filters.month);
    if (filters?.year) params = params.set('year', filters.year);
    return this.http.get<ActionPlanModel[]>(this.api, { params });
  }

  getById(id: number): Observable<ActionPlanModel> {
    return this.http.get<ActionPlanModel>(`${this.api}/${id}`);
  }

  create(body: ActionPlanCreateRequest): Observable<ActionPlanModel> {
    return this.http.post<ActionPlanModel>(this.api, body);
  }

  report(activityId: number, body: ActionPlanReportRequest): Observable<ActionPlanActivityModel> {
    return this.http.put<ActionPlanActivityModel>(
      `${this.api}/activities/${activityId}/report`, body
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  deleteActivity(activityId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/activities/${activityId}`);
  }

  getDashboard(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/dashboard/users`);
  }
}
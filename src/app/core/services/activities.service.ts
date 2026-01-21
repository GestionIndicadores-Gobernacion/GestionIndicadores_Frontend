import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ActivityModel, ActivityCreateRequest, ActivityUpdateRequest } from '../models/activity.model';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private api = `${environment.apiUrl}/activity`;

  constructor(private http: HttpClient) { }

  // =======================================
  // GET ALL
  // =======================================
  getAll() {
    return this.http.get<ActivityModel[]>(this.api);
  }

  // =======================================
  // GET BY ID
  // =======================================
  getById(id: number) {
    return this.http.get<ActivityModel>(`${this.api}/${id}`);
  }

  // =======================================
  // CREATE
  // =======================================
  create(body: ActivityCreateRequest) {
    return this.http.post<ActivityModel>(this.api, body);
  }

  // =======================================
  // UPDATE
  // =======================================
  update(id: number, body: ActivityUpdateRequest) {
    return this.http.put<ActivityModel>(`${this.api}/${id}`, body);
  }

  // =======================================
  // DELETE
  // =======================================
  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }

  // ============================================================
  // GET ACTIVITIES BY STRATEGY (Necesario para selects dependientes)
  // ============================================================
  getByStrategy(strategyId: number) {
    return this.http.get<ActivityModel[]>(
      `${environment.apiUrl}/strategy/${strategyId}/activities`
    );
  }
}

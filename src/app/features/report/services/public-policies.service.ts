import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PublicPolicyModel } from '../models/component.model';

@Injectable({
  providedIn: 'root',
})
export class PublicPoliciesService {

  private api = `${environment.apiUrl}/public-policies`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<PublicPolicyModel[]> {
    return this.http.get<PublicPolicyModel[]>(this.api);
  }

  create(body: { code: string; description: string }): Observable<PublicPolicyModel> {
    return this.http.post<PublicPolicyModel>(this.api, body);
  }

  update(id: number, body: { code: string; description: string }): Observable<PublicPolicyModel> {
    return this.http.put<PublicPolicyModel>(`${this.api}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private api = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) { }

  getOverview() {
    return this.http.get(`${this.api}/overview`);
  }

  getTotals() {
    return this.http.get(`${this.api}/totales`);
  }
}

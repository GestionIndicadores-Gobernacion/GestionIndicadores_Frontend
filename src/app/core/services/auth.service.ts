import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { LoginRequest, LoginResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) { }

  login(body: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.api}/login`, body);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  saveSession(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

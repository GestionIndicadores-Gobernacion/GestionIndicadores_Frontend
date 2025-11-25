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

  // -----------------------------
  // LOGIN
  // -----------------------------
  login(body: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.api}/login`, body);
  }

  // -----------------------------
  // GUARDAR TOKENS
  // -----------------------------
  saveSession(accessToken: string, refreshToken: string, user: any) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // -----------------------------
  // OBTENER TOKENS
  // -----------------------------
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  // -----------------------------
  // REFRESH TOKEN
  // -----------------------------
  refreshToken() {
    const refreshToken = this.getRefreshToken();

    return this.http.post<{ access_token: string }>(
      `${this.api}/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );
  }

  // -----------------------------
  // LOGOUT
  // -----------------------------
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

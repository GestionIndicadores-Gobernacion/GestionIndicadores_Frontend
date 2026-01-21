import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private api = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) { }

  // =====================================================
  // 1️⃣ LOGIN
  // =====================================================
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, data).pipe(
      tap(res => {
        this.saveSession(res.access_token, res.refresh_token, res.user);
      })
    );
  }

  // =====================================================
  // 2️⃣ GUARDAR SESIÓN
  // =====================================================
  saveSession(access: string, refresh: string, user: any) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // =====================================================
  // 3️⃣ OBTENER TOKENS
  // =====================================================
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  // =====================================================
  // 4️⃣ VALIDAR PERFIL (verifica token)
  //      GET /auth/me
  // =====================================================
  me() {
    return this.http.get(`${this.api}/me`);
  }

  // =====================================================
  // 5️⃣ REFRESH TOKEN
  //      POST /auth/refresh (usa refresh token)
  // =====================================================
  refreshToken(): Observable<{ access_token: string }> {
    const refresh = this.getRefreshToken();

    return this.http.post<{ access_token: string }>(
      `${this.api}/refresh`,
      {},
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${refresh}`,
        }),
      }
    ).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
      })
    );
  }

  // =====================================================
  // 6️⃣ LOGOUT
  // =====================================================
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

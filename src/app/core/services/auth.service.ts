import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

import { LoginRequest, LoginResponse } from '../models/auth.model';

interface JwtPayload {
  sub: number;
  role_id: number;
  exp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private api = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

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
  // 3️⃣ OBTENER TOKENS / USER
  // =====================================================
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUser(): any | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  // =====================================================
  // 4️⃣ JWT HELPERS (FUENTE DE VERDAD)
  // =====================================================
  getTokenPayload(): JwtPayload | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const payload = this.getTokenPayload();
    if (!payload) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !this.isTokenExpired();
  }

  hasRole(roleId: number): boolean {
    const payload = this.getTokenPayload();
    return payload?.role_id === roleId;
  }

  // =====================================================
  // 5️⃣ PERFIL (NO USAR COMO GUARD)
  // =====================================================
  me(): Observable<any> {
    return this.http.get(`${this.api}/me`);
  }

  // =====================================================
  // 6️⃣ REFRESH TOKEN
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
  // 7️⃣ LOGOUT
  // =====================================================
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

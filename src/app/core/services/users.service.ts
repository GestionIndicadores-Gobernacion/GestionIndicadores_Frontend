import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { UserResponse, UserCreateRequest, UserUpdateRequest } from '../models/user.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  /** Obtener todos los usuarios */
  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.api);
  }

  /** Obtener usuario por ID */
  getById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.api}/${id}`);
  }

  /** Obtener usuario actual (me) */
  getMe(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.api}/me`);
  }

  /** Crear usuario */
  create(body: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.api, body);
  }

  /** Actualizar usuario */
  update(id: number, body: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.api}/${id}`, body);
  }

  /** Eliminar usuario (soft delete) */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
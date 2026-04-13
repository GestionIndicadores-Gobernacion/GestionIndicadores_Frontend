import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { UserResponse, UserCreateRequest, UserUpdateRequest } from '../models/user.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.api);
  }

  getById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.api}/${id}`);
  }

  getMe(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.api}/me`);
  }

  create(body: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.api, body);
  }

  update(id: number, body: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.api}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /** Asignar un componente individual */
  assignComponent(userId: number, componentId: number): Observable<any> {
    return this.http.post(`${this.api}/${userId}/components/${componentId}`, {});
  }

  /** Quitar un componente individual */
  removeComponent(userId: number, componentId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${userId}/components/${componentId}`);
  }
}
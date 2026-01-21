import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoleResponse, RoleCreateRequest, RoleUpdateRequest } from '../models/role.model';

@Injectable({
  providedIn: 'root',
})
export class RolesService {
  private api = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) { }

  /** Obtener todos los roles */
  getAll(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.api);
  }

  /** Obtener rol por ID */
  getById(id: number): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.api}/${id}`);
  }

  /** Crear rol */
  create(body: RoleCreateRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(this.api, body);
  }

  /** Actualizar rol */
  update(id: number, body: RoleUpdateRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.api}/${id}`, body);
  }

  /** Eliminar rol */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { UserResponse, UserCreateRequest, UserUpdateRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  getAll() {
    return this.http.get<UserResponse[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<UserResponse>(`${this.api}/${id}`);
  }

  create(body: UserCreateRequest) {
    return this.http.post<UserResponse>(this.api, body);
  }

  update(id: number, body: UserUpdateRequest) {
    return this.http.put<UserResponse>(`${this.api}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }
}

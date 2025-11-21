export interface UserModel {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role?: RoleModel;    // viene del backend
}

export interface RoleModel {
  id: number;
  name: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role_id: number;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  password?: string;
  role_id?: number;
}

export interface UserResponse extends UserModel {}

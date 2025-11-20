export interface UserModel {
  id: number;
  nombre: string;
  email: string;
  password?: string; // opcional para no exponerla en listados
  role_id: number;
  profile_picture?: string;
  created_at: string;
  role?: RoleModel;
}

export interface RoleModel {
  id: number;
  nombre: string;
}


export interface UserCreateRequest {
  nombre: string;
  email: string;
  password: string;
  role_id: number;
}

export interface UserUpdateRequest {
  id: number;
  nombre?: string;
  email?: string;
  password?: string;     // editable opcional
  role_id?: number;
  profile_picture?: string;
}

export interface UserResponse extends UserModel { }

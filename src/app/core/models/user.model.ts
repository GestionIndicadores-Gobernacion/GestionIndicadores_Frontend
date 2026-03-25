export interface UserComponent {
  component_id: number;
  component_name: string;
}

export interface RoleModel {
  id: number;
  name: string;
}

export interface UserModel {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: RoleModel;
  component_assignments?: UserComponent[];
}

export interface UserCreateRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role_id?: number;
  profile_image_url?: string;
  component_ids?: number[];
}

export interface UserUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  role_id?: number;
  profile_image_url?: string;
  component_ids?: number[];
}

export interface UserResponse extends UserModel {}
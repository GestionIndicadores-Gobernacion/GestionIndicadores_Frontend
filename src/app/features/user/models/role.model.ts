export interface RoleModel {
  id: number;
  name: string;
  description?: string;
}

export interface RoleCreateRequest {
  name: string;
  description?: string;
}

export interface RoleUpdateRequest {
  id: number;
  name?: string;
  description?: string;
}

export interface RoleResponse extends RoleModel { }

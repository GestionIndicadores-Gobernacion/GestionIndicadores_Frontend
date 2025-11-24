export interface ComponentModel {
  id: number;
  name: string;          // antes: nombre
  description: string;   // antes: descripcion
  active: boolean;
}

export interface ComponentCreateRequest {
  name: string;
  description: string;
  active?: boolean;
}

export interface ComponentUpdateRequest {
  id: number;
  name?: string;
  description?: string;
  active?: boolean;
}

export interface ComponentResponse extends ComponentModel {}

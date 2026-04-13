export interface Field {
  id: number;
  table_id: number;

  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'date';

  required: boolean;
  options?: any[] | null;
}

export interface FieldPayload {
  table_id: number;

  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'date';

  required?: boolean;
  options?: any[] | null;
}

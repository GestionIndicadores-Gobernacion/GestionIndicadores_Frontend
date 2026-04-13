/**
 * Tabla (solo lectura desde API)
 */
export interface Table {
  id: number;
  dataset_id: number;
  name: string;
  description?: string | null;
  active: boolean;
  created_at: string;

  // viene dump_only
  table_fields?: any[]; // luego lo tipamos cuando hagas Field
}

/**
 * Payload para crear / editar
 */
export interface TablePayload {
  name: string;
  description?: string | null;
}

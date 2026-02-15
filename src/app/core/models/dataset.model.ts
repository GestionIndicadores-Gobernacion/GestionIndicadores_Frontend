export interface Dataset {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  created_at: string;
}

/**
 * Para crear / editar
 */
export interface DatasetPayload {
  name: string;
  description?: string | null;
}


export interface DatasetImportResult {
  dataset_id: number;
  dataset_name: string;
  tables_created: number;
  fields_created: number;
  records_inserted: number;
}

export interface DatasetImportPreview {
  sheet_name: string;
  rows_total: number;
  rows_with_data: number;
  fields: PreviewField[];
  ignored_columns: string[];
  sample_rows: any[];
}

export interface PreviewField {
  column: string;
  field_name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  selected?: boolean;
}

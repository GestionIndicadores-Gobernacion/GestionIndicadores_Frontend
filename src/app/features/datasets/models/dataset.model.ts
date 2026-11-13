export interface Dataset {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  created_at: string;
  updated_at?: string | null;
  /** Tipo de dashboard guardado en el dataset (presupuesto, denuncias, generico...). */
  dataset_type?: string | null;
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
  failed_rows?: number;
  skipped_rows?: number;
  dataset_type?: string | null;
  dataset_type_label?: string;
  previous_dataset_type?: string | null;
  columns_added?: string[];
  columns_removed?: string[];
  warnings?: string[];
  name_changed?: boolean;
  file_processed?: boolean;
}

/** Respuesta 409 de update-excel cuando el archivo no sirve para el dashboard del dataset. */
export interface DatasetTypeIncompatibleError {
  code: 'DATASET_TYPE_INCOMPATIBLE';
  message: string;
  expected_type: string;
  expected_type_label: string;
  detected_type: string;
  detected_type_label: string;
  missing_columns: string[];
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

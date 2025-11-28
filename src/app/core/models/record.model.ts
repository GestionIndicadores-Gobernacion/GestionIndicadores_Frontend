// core/models/record.model.ts

// Para stats de municipios
export interface RecordStatsMunicipio {
  municipio: string;
  total: number;
}

// Para stats por mes (YYYY-MM)
export interface RecordStatsMes {
  mes: string;
  total: number;
}

// detalle_poblacion: { [indicator_id]: valor }
export interface RecordDetallePoblacion {
  [indicatorId: number]: number;
}

export interface RecordModel {
  id: number;

  // Nuevo diseño
  strategy_id?: number;                // si ya lo tienes en el backend
  component_id: number | null;

  municipio: string;
  fecha: string;

  detalle_poblacion: RecordDetallePoblacion | null;

  evidencia_url: string | null;

  creado_por?: string | null;
  fecha_registro?: string;

  // ------------ CAMPOS LEGACY PARA QUE COMPILEN LAS VISTAS ------------
  indicator_id?: number | null;        // por si alguna vista vieja aún lo usa
  tipo_poblacion?: string[];           // para record-detail.html (chips)
  valor?: string | null;               // si quedó referenciado en algún lado
  // --------------------------------------------------------------------
}

// Para crear registro desde el formulario
export interface RecordCreateRequest {
  strategy_id: number;
  component_id: number;
  municipio: string;
  fecha: string;
  detalle_poblacion: RecordDetallePoblacion;
  evidencia_url: string | null;
}

// Para actualizar (si lo usas)
export interface RecordUpdateRequest extends RecordCreateRequest {
}

// =====================================================================
// 🔧 Tipos legacy para compatibilidad con el código existente
// =====================================================================

// =======================================================
// 🔧 Filtros usados por RecordsService (versión legacy)
// =======================================================

export interface RecordFilterParams {
  search?: string;
  component_id?: number | null;
  indicator_id?: number | null;
  municipio?: string | null;

  // filtros de fecha (legacy, usados en el frontend)
  fecha_from?: string | null;
  fecha_to?: string | null;
}


// Antes existía "tipo_poblacion", lo dejamos por compatibilidad
export interface RecordStatsTipoPoblacion {
  tipo: string;
  total: number;
}

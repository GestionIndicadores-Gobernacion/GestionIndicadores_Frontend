// =======================================================
// 📌 MODELOS ACTUALIZADOS – ARQUITECTURA FINAL
// Record → Component → Activity → Strategy
// =======================================================


// =======================
// 📊 Stats: municipios
// =======================
export interface RecordStatsMunicipio {
  municipio: string;
  total: number;
}

// =======================
// 📅 Stats: meses
// =======================
export interface RecordStatsMes {
  mes: string;
  total: number;
}


// =======================================================
// 📌 ESTRUCTURA DETALLE_POBLACION (NUEVA)
// =======================================================

export interface RecordIndicadoresPorMunicipio {
  [indicador: string]: RecordIndicadorDetalle;
}

export interface RecordMunicipioDetalle {
  indicadores: RecordIndicadoresPorMunicipio;
}

export interface RecordDetallePoblacion {
  municipios: {
    [municipio: string]: RecordMunicipioDetalle;
  };
}


// =======================================================
// 📌 MODELO PRINCIPAL (LECTURA / LISTADOS / EXCEL)
// =======================================================

export interface RecordModel {
  id: number;

  // 🔎 IDs DERIVADOS (solo lectura)
  strategy_id: number;
  activity_id: number;
  component_id: number;

  fecha: string;
  description?: string | null;
  actividades_realizadas?: string | null;

  detalle_poblacion: RecordDetallePoblacion;

  evidencia_url: string | null;
  fecha_registro?: string | null;

  // ---------------------------------------------------
  // 🧩 CAMPOS LEGACY (para pantallas antiguas)
  // ---------------------------------------------------
  municipio?: string | null;
  indicator_id?: number | null;
  tipo_poblacion?: string[];
  valor?: string | null;
}


// =======================================================
// ✏ CREAR REGISTRO (🔥 SOLO component_id)
// =======================================================

export interface RecordCreateRequest {
  component_id: number;

  fecha: string;
  description?: string | null;
  actividades_realizadas?: string | null;

  detalle_poblacion: RecordDetallePoblacion;

  evidencia_url: string | null;
}


// =======================================================
// ✏ ACTUALIZAR REGISTRO
// =======================================================

export interface RecordUpdateRequest extends RecordCreateRequest { }


// =======================================================
// 🔍 FILTROS (LISTADOS / REPORTES)
// =======================================================

export interface RecordFilterParams {
  search?: string;

  component_id?: number | null;
  indicator_id?: number | null;

  // legacy
  municipio?: string | null;

  fecha_from?: string | null;
  fecha_to?: string | null;
}


// =======================================================
// 📊 Stats por tipo de población
// =======================================================

export interface RecordStatsTipoPoblacion {
  tipo: string;
  total: number;
}

// 👤 Tipos de población (aún no los usamos)
export interface RecordTipoPoblacionDetalle {
  mujeres?: number;
  poblacion_afro?: number;
  discapacidad?: number;
}

// 📊 Detalle por indicador
export interface RecordIndicadorDetalle {
  total: number;
  tipos_poblacion?: RecordTipoPoblacionDetalle;
}

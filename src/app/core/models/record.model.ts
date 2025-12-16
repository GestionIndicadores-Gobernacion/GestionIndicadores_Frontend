// =======================================================
// 📌 MODELOS ACTUALIZADOS PARA EL NUEVO DISEÑO
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
// 📌 NUEVA ESTRUCTURA DE DETALLE_POBLACION
// =======================================================

// Ejemplo de estructura:
// detalle_poblacion = {
//   municipios: {
//     "Cali": {
//       indicadores: { habitantes_calle: 25, adultos_mayores: 4 }
//     },
//     "Palmira": {
//       indicadores: { habitantes_calle: 8 }
//     }
//   }
// }

export interface RecordIndicadoresPorMunicipio {
  [indicador: string]: number;
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
// 📌 MODELO PRINCIPAL DEL REGISTRO (🔥 ACTUALIZADO)
// =======================================================
export interface RecordModel {
  id: number;

  // 🔥 Nuevos campos obligatorios del nuevo diseño
  strategy_id: number;
  activity_id: number;
  component_id: number;

  fecha: string;
  description?: string | null;
  actividades_realizadas?: string | null;
  
  detalle_poblacion: RecordDetallePoblacion;

  evidencia_url: string | null;
  fecha_registro?: string | null;

  // --------------------------------------------------------------------
  // 🧩 CAMPOS LEGACY (mientras migras pantallas antiguas)
  // * estos siguen existiendo porque varias pantallas los leen
  // --------------------------------------------------------------------
  municipio?: string | null;  
  indicator_id?: number | null;
  tipo_poblacion?: string[]; 
  valor?: string | null;
}


// =======================================================
// ✏ PARA CREAR (🔥 activity + description añadidos)
// =======================================================
export interface RecordCreateRequest {
  strategy_id: number;
  activity_id: number;
  component_id: number;

  fecha: string;
  description?: string | null;
  actividades_realizadas?: string | null;

  detalle_poblacion: RecordDetallePoblacion;

  evidencia_url: string | null;
}


// =======================================================
// ✏ PARA ACTUALIZAR
// =======================================================
export interface RecordUpdateRequest extends RecordCreateRequest {}


// =======================================================
// 🧩 LEGACY – AÚN EN USO EN ALGUNOS FILTROS
// =======================================================
export interface RecordFilterParams {
  search?: string;

  component_id?: number | null;
  indicator_id?: number | null;

  // municipio legacy (siempre null en el nuevo modelo)
  municipio?: string | null;

  fecha_from?: string | null;
  fecha_to?: string | null;
}

export interface RecordStatsTipoPoblacion {
  tipo: string;
  total: number;
}

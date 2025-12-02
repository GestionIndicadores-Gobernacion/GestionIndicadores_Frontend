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

// Ejemplo:
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
  [indicador: string]: number;  // un indicador con su valor
}

export interface RecordMunicipioDetalle {
  indicadores: RecordIndicadoresPorMunicipio;
}

export interface RecordDetallePoblacion {
  municipios: {
    [municipio: string]: RecordMunicipioDetalle;
  }
}


// =======================================================
// 📌 MODELO PRINCIPAL DEL REGISTRO
// =======================================================
export interface RecordModel {
  id: number;

  strategy_id: number;
  component_id: number;

  fecha: string;

  detalle_poblacion: RecordDetallePoblacion;

  evidencia_url: string | null;
  fecha_registro?: string | null;

  // --------------------------------------------------------------------
  // 🧩 CAMPOS LEGACY (mientras migras pantallas antiguas)
  // --------------------------------------------------------------------

  // Muchos componentes viejos usan esto para mostrar chips o filtros
  municipio?: string | null;  // ← ahora SIEMPRE vendrá como null

  indicator_id?: number | null;
  tipo_poblacion?: string[]; 
  valor?: string | null;
}

// =======================================================
// ✏ Para crear
// =======================================================
export interface RecordCreateRequest {
  strategy_id: number;
  component_id: number;
  fecha: string;
  detalle_poblacion: RecordDetallePoblacion;
  evidencia_url: string | null;
}

// =======================================================
// ✏ Para actualizar
// =======================================================
export interface RecordUpdateRequest extends RecordCreateRequest {}


// =======================================================
// 🧩 Legacy (aún usados en RecordsService o filtros viejos)
// =======================================================
export interface RecordFilterParams {
  search?: string;
  component_id?: number | null;
  indicator_id?: number | null;

  // ahora NO filtra por municipio porque no existe como columna
  municipio?: string | null;

  fecha_from?: string | null;
  fecha_to?: string | null;
}

export interface RecordStatsTipoPoblacion {
  tipo: string;
  total: number;
}

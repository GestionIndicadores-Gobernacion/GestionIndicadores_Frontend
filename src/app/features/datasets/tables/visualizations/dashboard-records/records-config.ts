export interface RecordsConfig {
  tableFields: string[];
  yesnoFields: string[];
  categoricalFields: string[];
  searchPlaceholder: string;
  // Header del panel de detalle
  detailTitle: string;        // campo que va como título principal
  detailSubtitle: string[];   // campos que van como subtítulo (se unen con · )
}

export const RECORDS_CONFIG: Record<string, RecordsConfig> = {

  personas_capacitadas: {
    tableFields: ['nombres_y_apellidos', 'documento', 'mes', 'municipio', 'telefono', 'edad'],
    yesnoFields: ['mujer', 'hombre', 'lgbtiq_', 'intersesual', 'afro', 'indigena', 'rrom', 'discapacidad', 'victima', 'reincorporado'],
    categoricalFields: ['municipio', 'mes'],
    searchPlaceholder: 'Buscar persona, documento...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio', 'mes'],
  },

  animales: {
    tableFields: [
      'nombres_y_apellidos',
      'municipio_de_residencia',
      'tipo_de_vinculacion_dentro_de_la_red_animalia_valle',
      'perros_cantidad',
      'gatos_cantidad',
      'telefono_celular',
      'edad',
    ],
    yesnoFields: [
      'esta_dispuesto_a_recibir_una_visita_de_la_gobernacion_del_valle_del_cauca',
      'esta_dispuesto_en_dar_en_adopcion_los_animales_que_tiene_a_cargo',
      'tienes_algun_emprendimiento',
      'tiene_alguna_fuente_de_ingreso',
      'actualmente_recibe_donaciones_de_alguna_entidad',
      'tiene_capacidad_operativa_para_apoyar_rescates_cual',
      'estaria_dispuestoa_a_recibir_en_su_espacio_fisico_a_un_animal_que_ha_sido_victima_de_violencia',
    ],
    categoricalFields: [
      'municipio_de_residencia',
      'tipo_de_vinculacion_dentro_de_la_red_animalia_valle',
      'nivel_de_escolaridad',
      'sexo',
    ],
    searchPlaceholder: 'Buscar protector, municipio, fundación...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio_de_residencia', 'tipo_de_vinculacion_dentro_de_la_red_animalia_valle'],
  },

  presupuesto: {
    tableFields: [
      'nombre_cgestor',
      'desc_grupo',
      'desc_subgrupo',
      'descripcion_proyecto',
      'apropiacion_definitiva',
      'cdp_ejecutado',
      'total_pagos',
      'presup_disponible',
      'ejecutado',
    ],
    yesnoFields: [],
    categoricalFields: ['desc_grupo', 'desc_subgrupo', 'desc_sector'],
    searchPlaceholder: 'Buscar rubro, proyecto, sector...',
    detailTitle: 'descripcion_aprobacionrubro',
    detailSubtitle: ['desc_grupo', 'desc_sector'],
  },

  generico: {
    tableFields: [],
    yesnoFields: [],
    categoricalFields: [],
    searchPlaceholder: 'Buscar...',
    detailTitle: '',
    detailSubtitle: [],
  },

};

export const DEFAULT_CONFIG: RecordsConfig = RECORDS_CONFIG['generico'];
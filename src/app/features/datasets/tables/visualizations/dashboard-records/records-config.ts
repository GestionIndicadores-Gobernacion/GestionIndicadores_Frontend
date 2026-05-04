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

  personas_capacitadas_consolidado: {
    tableFields: [
      'fecha',
      'municipio',
      'nombres_y_apellidos',
      'documento',
      'telefono',
      'correo_electronico',
      'edad',
      'guia_1',
      'guia_2',
      'guia_3',
      'observacion',
    ],
    // Nota: el header del Excel real es "INTERSESiUAL" (typo en origen) →
    // se normaliza como `intersesiual`. Mantenemos también 'intersexual'
    // por si la base se corrige a futuro.
    yesnoFields: [
      'mujer', 'hombre', 'intersesiual', 'intersexual', 'lgbtiq',
      'afro', 'indigena', 'rrom',
      'discapacidad', 'victima', 'reincorporado',
      'rural', 'urbana',
      'guia_1', 'guia_2', 'guia_3',
    ],
    categoricalFields: ['municipio', 'fecha'],
    searchPlaceholder: 'Buscar persona, documento, municipio...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio', 'fecha'],
  },

  animales: {
    tableFields: [
      'nombres_y_apellidos',
      // Nuevo formato (BASE DE DATOS RED ANIMALIA simple)
      'municipio',
      'telefono',
      'otro_telefono',
      'correo_electronico',
      // Formato anterior (base protectores completa)
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
      'municipio',
      'municipio_de_residencia',
      'tipo_de_vinculacion_dentro_de_la_red_animalia_valle',
      'nivel_de_escolaridad',
      'sexo',
    ],
    searchPlaceholder: 'Buscar persona, municipio, fundación...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio', 'municipio_de_residencia', 'tipo_de_vinculacion_dentro_de_la_red_animalia_valle'],
  },

  presupuesto: {
    tableFields: [
      // Nuevo formato (C.Gestor / Fondo / Descripcion PEP / ...)
      'descripcion_pep',
      'descripcion_proyecto',
      'cgestor',
      'fondo',
      'pres_inicial',
      'apropiacion_definitiva',
      'total_ejecutado',
      'total_obligaciones',
      'total_pagos',
      'presup_disponible',
      'ejecutado',
      // Formato anterior (compatibilidad)
      'nombre_cgestor',
      'desc_grupo',
      'cdp_ejecutado',
    ],
    yesnoFields: [],
    categoricalFields: ['fondo', 'proyecto', 'cgestor', 'desc_grupo', 'desc_subgrupo', 'desc_sector'],
    searchPlaceholder: 'Buscar rubro, proyecto, fondo...',
    detailTitle: 'descripcion_pep',
    detailSubtitle: ['fondo', 'descripcion_proyecto', 'desc_grupo'],
  },

  red_animalia: {
    tableFields: [
      'nombres_y_apellidos',
      'municipio_de_residencia',
      'tipo_de_vinculacion_dentro_de_la_red_animalia_valle',
      'nombre_hogar_de_paso_albergue_o_refugio_fundacion',
      'perros_cantidad',
      'gatos_cantidad',
      'caballos_cantidad',
      'telefono_celular',
      'correo_electronico',
      'sexo',
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
      'sexo',
      'nivel_de_escolaridad',
    ],
    searchPlaceholder: 'Buscar persona, municipio, organizacion...',
    detailTitle: 'nombres_y_apellidos',
    detailSubtitle: ['municipio_de_residencia', 'tipo_de_vinculacion_dentro_de_la_red_animalia_valle'],
  },

  censo_animal: {
    tableFields: [
      'municipio',
      'poblacion_perros_2026',
      'poblacion_gatos_2026',
      'no_viviendas_encuestadas',
      'no_perros_reportados',
      'no_gatos_reportados',
      'vta',
      'pob_ajustada',
      'estimado_de_perros',
      'estimado_de_gatos',
    ],
    yesnoFields: [],
    categoricalFields: ['municipio'],
    searchPlaceholder: 'Buscar municipio...',
    detailTitle: 'municipio',
    detailSubtitle: ['poblacion_perros_2026', 'poblacion_gatos_2026'],
  },

  denuncias: {
    tableFields: [
      'numero_de_caso',
      'fecha',
      'nombre_del_denunciante',
      'tipo_de_documento',
      'numero_de_documento',
      // El nombre real del campo varía por la longitud del header en el Excel.
      // Se incluyen las variantes más probables tras normalize_name (truncado a 100 chars).
      'escriba_el_municipio_donde_se_esta_presentando_el_maltrato',
      'municipio',
      'especie_afectada_por_el_presunto_maltrato_animal',
      'su_denuncia_es_anonima',
      'denuncia_anonima',
      'numero_de_celular_en_caso_de_requerir_mas_informacion_sobre_la_denuncia',
      'correo_electronico_para_enviar_respuesta_y_seguimiento_de_la_denuncia',
    ],
    yesnoFields: [],
    categoricalFields: [
      'municipio',
      'escriba_el_municipio_donde_se_esta_presentando_el_maltrato',
      'tipo_de_documento',
      'especie_afectada_por_el_presunto_maltrato_animal',
    ],
    searchPlaceholder: 'Buscar caso, denunciante, municipio...',
    detailTitle: 'numero_de_caso',
    detailSubtitle: ['fecha', 'escriba_el_municipio_donde_se_esta_presentando_el_maltrato', 'municipio'],
  },

  donaton: {
    tableFields: [
      'nombre',
      'municipio',
      'fecha',
      'alimento_perro',
      'alimento_gato',
      'total',
      'telefono',
    ],
    yesnoFields: [],
    categoricalFields: ['municipio'],
    searchPlaceholder: 'Buscar donante, municipio...',
    detailTitle: 'nombre',
    detailSubtitle: ['municipio', 'fecha'],
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
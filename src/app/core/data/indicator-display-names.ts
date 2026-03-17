export const INDICATOR_DISPLAY_NAMES: Record<number, string> = {

    // ANIMALES EMBAJADORES DE PAZ
    93: 'Animales atendidos',
    128: 'Adultos mayores con terapia asistida',

    // RUTA DE ATENCIÓN
    31: 'Casos reportados',
    32: 'Casos atendidos',
    33: 'Casos solucionados',

    // ENFOQUE DIFERENCIAL
    36: 'Animales atendidos',
    37: 'Personas sensibilizadas',

    // ASISTENCIAS TECNICAS
    94: 'Tipo de actor',
    95: 'Temas tratados',
    96: 'Personas asistidas',

    // TURISMO MULTIESPECIE
    34: 'Personas capacitadas',
    35: 'Tipo de avistamiento',

    // UNIDAD MOVIL
    97: 'Cantidad de jornadas con insumos vs sin insumos',
    99: 'Cantidad de animales atendidos vs meses',

    // ATENCION VETERINARIA EN CAMPO 
    100: 'Insumos',
    102: 'Espacio atendido',
    103: 'Nombre',
    125: 'Animales atendidos',

    // CBA
    49: 'Nombre CBA',
    132: 'Tipo de dotación',

    // RED ANIMALIA
    64: 'Tipo de actor asistido',
    65: 'Nombre',
    66: 'Tipo de acompañamiento',

    // Donatón
    68: 'Red Animalia',
    69: 'Alimento entregado',
    70: 'Nombre refugio',

    // Acompañamiento psicosocial
    106: 'Red Animalia',
    107: 'Nombre refugio',
    108: 'Tipo de apoyo',

    // Programa de adopciones
    109: 'Jornadas realizadas',
    110: 'Animales publicados',
    111: 'Animales adoptados',
    112: 'Red Animalia',

    // RIA
    122: 'Red Animalia',
    123: 'Nombre refugio',
    127: 'Link formato inspección',

    // Juntas defensoras
    74: 'Asistencias técnicas',
    126: 'Juntas con acto administrativo',

    // Escuadrón Benji
    113: 'Institución educativa',
    114: 'Cantidad impactada',
    115: 'Rango de edades',

    // Dejando huella
    116: 'Institución educativa',
    117: 'Jóvenes inscritos',
    118: 'Proyectos radicados',

    // Alianzas académicas
    119: 'Nombre foro',
    120: 'Tema tratado',
    121: 'Personas asistentes',  // ya existía, confirmar

    // Experiencias culturales
    81: 'Acciones artísticas/culturales',
    146: 'Nombre del evento',       // ← nuevo
    147: 'Personas asistentes',     // ← nuevo

    // MESA PYBA
    129: 'Tipo de actor / Mesas',
    130: 'Temas tratados',
    131: 'Total asistentes por mes',

};

export function getIndicatorDisplayName(id: number, fallback: string): string {
    return INDICATOR_DISPLAY_NAMES[id] ?? fallback;
}

export const METRIC_DISPLAY_NAMES: Record<string, string> = {
    'no_de_animales_esterilizados': 'Esterilizados',
    'no_de_animales_desparasitados': 'Desparasitados',
    'no_de_animales_con_atencion_veterinaria': 'Atención veterinaria',
    'no_de_animales_vitaminizados': 'Vitaminizados',
    'no_de_animales_vacunados': 'Vacunados',
};

export function getMetricDisplayName(key: string): string {
    return METRIC_DISPLAY_NAMES[key] ?? key.replace(/_/g, ' ');
}
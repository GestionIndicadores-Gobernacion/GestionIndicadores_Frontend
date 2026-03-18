export interface ExplorerVirtualConfig {
    showReportesPorMes: boolean;
    showReportesPorMunicipio: boolean;
    showIndicadoresPorMunicipio: boolean;
    hiddenIndicators?: number[];
    locationLabel?: string;
    jornadasPorMesLabel?: string;
    subViews?: Record<number, Record<string, string>>;
    showTemasPorMunicipio?: boolean;  // ← nuevo
}

export const COMPONENT_EXPLORER_CONFIG: Record<number, ExplorerVirtualConfig> = {
    1: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [],
    },
    2: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [94],  // ocultar TIPO DE ACTOR ASISTIDO
        locationLabel: 'Asistencias por municipio',  // ← cambio
        showTemasPorMunicipio: true,  // ← nuevo flag
        jornadasPorMesLabel: 'Asistencias por tiempo',  // ← para personas asistidas x tiempo
    },
    3: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [32, 33],  // ocultar casos atendidos y solucionados
    },
    4: { showReportesPorMes: true, showReportesPorMunicipio: false, showIndicadoresPorMunicipio: false },
    5: { showReportesPorMes: false, showReportesPorMunicipio: false, showIndicadoresPorMunicipio: false },
    // CBA
    7: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [49, 50, 132],  // ocultar todos los reales
        locationLabel: 'CBA dotados por municipio',
    },
    // component-explorer-config.ts — solo cambia comp 8
    8: {
        showReportesPorMes: true,
        showReportesPorMunicipio: false,  // ← apagar el genérico, lo manejamos en virtuales
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [97, 99],
        jornadasPorMesLabel: 'Cantidad de jornadas vs meses',
    },
    9: {
        showReportesPorMes: true,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [103, 100, 102, 125, 136],  // ← agregar 136
        jornadasPorMesLabel: 'Cantidad de jornadas vs meses',
    },
    14: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [143, 144, 145],
    },
    15: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [141, 142],
    },
    17: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [64, 65, 66, 156, 157, 158],
    },
    // Donatón salvando huellas
    16: {
        showReportesPorMes: true,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [70],  // ocultar NOMBRE
    },

    // Acompañamiento psicosocial
    18: {
        showReportesPorMes: true,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [107, 108],  // ocultar textos
    },
    19: {
        showReportesPorMes: true,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [123, 127],  // ocultar textos
        locationLabel: 'Albergues por municipio',
    },
    // Programa de adopciones
    27: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [],
    },
    21: {
        showReportesPorMes: false,          // ← apagar el genérico
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [74, 94, 95, 96, 126, 159, 160],  // ← ocultar todos los reales
    },
    // Promotores
    22: {
        showReportesPorMes: true,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [76, 77, 162, 163, 164],  // ocultar todos los reales
        jornadasPorMesLabel: 'Jornadas por mes',
    },
    // Escuadrón Benji
    23: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [113, 114, 115],  // ← volver a agregar 115
        locationLabel: 'Jornadas por municipio'
    },

    // Dejando huella
    24: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,          // ← quitar jornadas por municipio genérico
        showIndicadoresPorMunicipio: false,        // ← desactivar el genérico
        hiddenIndicators: [116, 117, 118],         // ← ocultar todos los reales
    },

    // Alianzas académicas
    25: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [119, 120, 121, 155],
    },

    // Experiencias culturales
    26: {
        showReportesPorMes: false,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [81, 146],
    },
    // Mesa PYBA
    28: {
        showReportesPorMes: true,
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,   // ← false
        hiddenIndicators: [130, 131, 129],    // ← ocultar todos los reales
        jornadasPorMesLabel: 'Cantidad de mesas por tiempo',
    },
};

export const DEFAULT_EXPLORER_CONFIG: ExplorerVirtualConfig = {
    showReportesPorMes: false,
    showReportesPorMunicipio: true,
    showIndicadoresPorMunicipio: true,
};
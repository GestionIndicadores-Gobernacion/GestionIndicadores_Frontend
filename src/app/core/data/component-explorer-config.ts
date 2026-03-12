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
    7: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [49, 50],
        locationLabel: 'CBA dotados por municipio',  // ← nuevo
    },
    8: {
        showReportesPorMes: true,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [],
        locationLabel: 'Cantidad de animales vs municipios',
        subViews: {
            99: {
                'CANINO': 'Cantidad de perros atendidos',
                'FELINO': 'Cantidad de gatos atendidos',
                'CANINO – Hembra': 'Cantidad de hembras (perro)',
                'CANINO – Macho': 'Cantidad de machos (perro)',
                'FELINO – Hembra': 'Cantidad de hembras (gato)',
                'FELINO – Macho': 'Cantidad de machos (gato)',
                'sub:red_animalia': 'Animales atendidos Red Animalia',
            }
        },
        jornadasPorMesLabel: 'Jornadas por mes',
    },
    9: {
        showReportesPorMes: true,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [103],
        subViews: {
            125: {
                'CANINO': 'Perros atendidos',
                'FELINO': 'Gatos atendidos',
                'CANINO – Hembra': 'Perras (hembra)',
                'CANINO – Macho': 'Perros (macho)',
                'FELINO – Hembra': 'Gatas (hembra)',
                'FELINO – Macho': 'Gatos (macho)',
            }
        }
    },
    17: {
        showReportesPorMes: true,  // ← número de actores vs meses
        showReportesPorMunicipio: false,
        showIndicadoresPorMunicipio: false,
        hiddenIndicators: [65],
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

    // Juntas defensoras de animales
    21: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [],
    },

    // Escuadrón Benji
    23: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [113],
    },

    // Dejando huella
    24: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [116],
    },

    // Alianzas académicas
    25: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [119, 120],
    },

    // Experiencias culturales
    26: {
        showReportesPorMes: false,
        showReportesPorMunicipio: true,
        showIndicadoresPorMunicipio: true,
        hiddenIndicators: [],
    },
};

export const DEFAULT_EXPLORER_CONFIG: ExplorerVirtualConfig = {
    showReportesPorMes: false,
    showReportesPorMunicipio: true,
    showIndicadoresPorMunicipio: true,
};
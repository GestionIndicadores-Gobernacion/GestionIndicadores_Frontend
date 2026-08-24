/**
 * Modos de análisis del visualizador de indicadores.
 *
 * Para agregar uno nuevo (p. ej. "Evolución temporal" o "Comparativo
 * territorial") bastan dos pasos:
 *   1. Añadir la entrada aquí.
 *   2. Añadir su bloque en `indicator-viewer.html` con
 *      `*ngIf="isMounted('<id>')"` + `[style.display]`.
 *
 * El contenedor no conoce ninguna vista en concreto: dibuja las pestañas
 * a partir de esta lista.
 */
export type IndicatorViewerModeId =
  | 'charts'
  | 'consolidated';

export interface IndicatorViewerMode {
  id: IndicatorViewerModeId;
  /** Texto de la pestaña. */
  label: string;
  /** Icono Lucide en kebab-case (debe estar en `LUCIDE_ICON_SET`). */
  icon: string;
  /** Versión corta para pantallas angostas; cae al `label` si falta. */
  shortLabel?: string;
  /**
   * Deja el componente montado al salir del modo, oculto por CSS.
   * Úsalo en vistas con petición HTTP propia o estado de filtros que no
   * conviene perder al alternar. Las vistas que se reconstruyen solo con
   * datos en memoria no lo necesitan.
   */
  keepAlive?: boolean;
}

export const INDICATOR_VIEWER_MODES: IndicatorViewerMode[] = [
  {
    id: 'charts',
    label: 'Gráficos',
    icon: 'chart-column',
  },
  {
    id: 'consolidated',
    label: 'Consolidado por municipio',
    shortLabel: 'Consolidado',
    icon: 'map-pinned',
    // Tiene su propio GET y estado de desglose/filtro: mantenerlo vivo
    // evita refetch y que el usuario pierda lo que había configurado.
    keepAlive: true,
  },
];

export const DEFAULT_VIEWER_MODE: IndicatorViewerModeId = 'charts';

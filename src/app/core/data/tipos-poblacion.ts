export type TipoPoblacionKey =
    | 'mujeres'
    | 'poblacion_afro'
    | 'discapacidad';

export interface TipoPoblacionConfig {
    key: TipoPoblacionKey;
    label: string;
}

export const TIPOS_POBLACION: TipoPoblacionConfig[] = [
    { key: 'mujeres', label: 'Mujeres' },
    { key: 'poblacion_afro', label: 'Población afro' },
    { key: 'discapacidad', label: 'Discapacidad' }
];

/**
 * Crea el objeto inicial:
 * { mujeres: 0, poblacion_afro: 0, discapacidad: 0 }
 */
export function buildTiposPoblacion(): Record<TipoPoblacionKey, number> {
    return TIPOS_POBLACION.reduce((acc, t) => {
        acc[t.key] = 0;
        return acc;
    }, {} as Record<TipoPoblacionKey, number>);
}

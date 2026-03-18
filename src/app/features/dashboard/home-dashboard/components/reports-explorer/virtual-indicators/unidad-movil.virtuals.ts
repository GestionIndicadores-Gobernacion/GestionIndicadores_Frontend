// getUnidadMovilVirtuals.ts
import { getCategoryDisplayName, getMetricDisplayName } from '../../../../../../core/data/indicator-display-names';
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

// Todas las métricas posibles según config del indicador 99
const METRICAS_ANIMALES = [
    'no_de_animales_esterilizados',
    'no_de_animales_desparasitados',
    'no_de_animales_con_atencion_veterinaria',
    'no_de_animales_vitaminizados',
    'no_de_animales_vacunados',
];

// Todas las categorías posibles según config del indicador 99
const CATEGORIAS_ANIMALES = [
    'CANINO',
    'FELINO',
    'EQUINO (VTA)',
    'ANIMALES DE PRODUCCION Y/O GRANJA',
];

function sumarMetricas(rows: { metric: string; total: number }[]): number {
    return rows
        .filter(r => METRICAS_ANIMALES.includes(r.metric))
        .reduce((s, r) => s + (r.total ?? 0), 0);
}

export function getUnidadMovilVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const insumos = raw.find(i => i.indicator_id === 97);
    const animales = raw.find(i => i.indicator_id === 99);
    const byLocNested = indicatorsAggregate?.by_location_nested ?? [];

    // 1. Cantidad de animales vs municipios
    if (byLocNested.length > 0) {
        const locationData = byLocNested
            .map(l => {
                const ind = l.indicators.find(i => i.indicator_id === 99);
                if (!ind) return null;
                const total = sumarMetricas(ind.metrics);
                return total > 0 ? { location: l.location, total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationData.length > 0) {
            virtual.push({
                indicator_id: -9020,
                indicator_name: 'Cantidad de animales vs municipios',
                field_type: 'by_location',
                by_location: locationData,
            });
        }
    }

    // 2. Tipo de atención vs municipios (cada métrica por separado)
    if (byLocNested.length > 0) {
        const metricas = [
            { metric: 'no_de_animales_esterilizados', label: 'Esterilizados vs municipios' },
            { metric: 'no_de_animales_desparasitados', label: 'Desparasitados vs municipios' },
            { metric: 'no_de_animales_con_atencion_veterinaria', label: 'Atención veterinaria vs municipios' },
            { metric: 'no_de_animales_vitaminizados', label: 'Vitaminizados vs municipios' },
            { metric: 'no_de_animales_vacunados', label: 'Vacunados vs municipios' },
        ];

        metricas.forEach(({ metric, label }, idx) => {
            const locationData = byLocNested
                .map(l => {
                    const ind = l.indicators.find(i => i.indicator_id === 99);
                    if (!ind) return null;
                    const m = ind.metrics.find(m => m.metric === metric);
                    return m && m.total > 0 ? { location: l.location, total: m.total } : null;
                })
                .filter(Boolean) as { location: string; total: number }[];

            if (locationData.length > 0) {
                virtual.push({
                    indicator_id: -(9010 + idx),
                    indicator_name: label,
                    field_type: 'by_location',
                    by_location: locationData,
                });
            }
        });
    }

    // 3. Cantidad de animales atendidos vs meses
    if (animales?.by_month?.length) {
        virtual.push({
            indicator_id: -9002,
            indicator_name: 'Animales esterilizados vs meses',
            field_type: 'by_month_sum',
            by_month: animales.by_month,
        });
    }

    // 4. Animales atendidos por especie (dinámico — todas las categorías de la config)
    if (animales?.by_nested) {
        const especieKeys = Object.keys(animales.by_nested)
            .filter(k => CATEGORIAS_ANIMALES.includes(k));

        const byCategEspecie = especieKeys
            .map(k => {
                const rows = animales.by_nested![k];
                if (!rows) return null;
                const total = sumarMetricas(rows);
                return total > 0 ? { category: getCategoryDisplayName(k + ' atendidos'), total } : null;
            })
            .filter(Boolean) as { category: string; total: number }[];

        if (byCategEspecie.length) {
            virtual.push({
                indicator_id: -9003,
                indicator_name: 'Animales atendidos por especie',
                field_type: 'by_category',
                by_category: byCategEspecie,
            });
        }
    }

    // 5. Hembras y machos por especie (dinámico)
    if (animales?.by_nested) {
        const subgrupoKeys = Object.keys(animales.by_nested)
            .filter(k => k.includes(' – ') && !k.startsWith('sub:'));

        const byCategSexo = subgrupoKeys
            .map(key => {
                const rows = animales.by_nested![key];
                if (!rows) return null;
                const total = sumarMetricas(rows);
                return total > 0 ? { category: getCategoryDisplayName(key), total } : null;
            })
            .filter(Boolean) as { category: string; total: number }[];

        if (byCategSexo.length) {
            virtual.push({
                indicator_id: -9004,
                indicator_name: 'Hembras y machos por especie',
                field_type: 'by_category',
                by_category: byCategSexo,
            });
        }
    }

    // 6. Por cada categoría: hembras vs machos individualmente
    if (animales?.by_nested) {
        CATEGORIAS_ANIMALES.forEach((cat, idx) => {
            const hembraKey = `${cat} – Hembra`;
            const machoKey = `${cat} – Macho`;
            const hembraRows = animales.by_nested![hembraKey];
            const machoRows = animales.by_nested![machoKey];

            const hembraTotal = hembraRows ? sumarMetricas(hembraRows) : 0;
            const machoTotal = machoRows ? sumarMetricas(machoRows) : 0;

            if (hembraTotal > 0 || machoTotal > 0) {
                const byCateg: { category: string; total: number }[] = [];
                if (hembraTotal > 0) byCateg.push({ category: getCategoryDisplayName(hembraKey), total: hembraTotal });
                if (machoTotal > 0) byCateg.push({ category: getCategoryDisplayName(machoKey), total: machoTotal });

                virtual.push({
                    indicator_id: -(9050 + idx),
                    indicator_name: `${getCategoryDisplayName(cat + ' atendidos')} — hembra vs macho`,
                    field_type: 'by_category',
                    by_category: byCateg,
                });
            }
        });
    }

    // 7. Animales Red Animalia
    if (animales?.by_nested?.['sub:red_animalia']) {
        const rows = animales.by_nested['sub:red_animalia'];
        const byCategAnimalia = rows
            .filter(r => r.total > 0)
            .map(r => ({ category: getMetricDisplayName(r.metric), total: r.total }));

        if (byCategAnimalia.length) {
            virtual.push({
                indicator_id: -9030,
                indicator_name: 'Animales atendidos Red Animalia',
                field_type: 'by_category',
                by_category: byCategAnimalia,
            });
        }
    }

    // 8. Jornadas con insumos vs sin insumos
    if (insumos?.by_category?.length) {
        virtual.push({
            indicator_id: -9001,
            indicator_name: 'Jornadas con insumos vs sin insumos',
            field_type: 'by_category',
            by_category: insumos.by_category,
        });
    }

    return virtual;
}
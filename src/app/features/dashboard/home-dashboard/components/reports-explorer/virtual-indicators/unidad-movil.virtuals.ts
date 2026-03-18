import { getCategoryDisplayName, getMetricDisplayName } from '../../../../../../core/data/indicator-display-names';
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getUnidadMovilVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const insumos = raw.find(i => i.indicator_id === 97);
    const animales = raw.find(i => i.indicator_id === 99);
    const byLocNested = indicatorsAggregate?.by_location_nested ?? [];

    // 1. Jornadas con insumos vs sin insumos
    if (insumos?.by_category?.length) {
        virtual.push({
            indicator_id: -9001,
            indicator_name: 'Jornadas con insumos vs sin insumos',
            field_type: 'by_category',
            by_category: insumos.by_category,
        });
    }

    // 2. Cantidad de animales atendidos vs meses
    if (animales?.by_month?.length) {
        virtual.push({
            indicator_id: -9002,
            indicator_name: 'Cantidad de animales atendidos vs meses',
            field_type: 'by_month_sum',
            by_month: animales.by_month,
        });
    }

    // 3. Animales atendidos por especie (dinámico)
    if (animales?.by_nested) {
        const especieKeys = Object.keys(animales.by_nested)
            .filter(k => !k.includes(' – ') && !k.startsWith('sub:'));

        const byCategEspecie = especieKeys
            .map(k => {
                const rows = animales.by_nested![k];
                if (!rows) return null;
                const total = rows.find(r => r.metric === 'no_de_animales_esterilizados')?.total ?? 0;
                return total > 0 ? { category: k, total } : null;
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

    // 4. Hembras y machos por especie (dinámico)
    if (animales?.by_nested) {
        const subgrupoKeys = Object.keys(animales.by_nested)
            .filter(k => k.includes(' – ') && !k.startsWith('sub:'));

        const byCategSexo = subgrupoKeys
            .map(key => {
                const rows = animales.by_nested![key];
                if (!rows) return null;
                const total = rows.find(r => r.metric === 'no_de_animales_esterilizados')?.total ?? 0;
                return total > 0 ? { category: key, total } : null;
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

    // 5. Tipo de atención vs municipios
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

    // 6. Cantidad de animales vs municipios
    if (byLocNested.length > 0) {
        const locationDataAnimales = byLocNested
            .map(l => {
                const ind = l.indicators.find(i => i.indicator_id === 99);
                if (!ind) return null;
                const total = ind.metrics
                    .filter(m => m.metric === 'no_de_animales_esterilizados')
                    .reduce((s, m) => s + (m.total ?? 0), 0);
                return total > 0 ? { location: l.location, total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationDataAnimales.length > 0) {
            virtual.push({
                indicator_id: -9020,
                indicator_name: 'Cantidad de animales vs municipios',
                field_type: 'by_location',
                by_location: locationDataAnimales,
            });
        }
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

    // 8. Subvistas dinámicas por especie
    // if (animales?.by_nested) {
    //     Object.keys(animales.by_nested).forEach((key, i) => {
    //         if (key.startsWith('sub:')) return;

    //         const rawName = key.includes(' – ') ? key : `${key} atendidos`;
    //         const displayName = getCategoryDisplayName(rawName);

    //         virtual.push({
    //             indicator_id: -(99 + 3000 + i),
    //             indicator_name: displayName,
    //             field_type: 'categorized_subview',
    //             by_nested: { [key]: animales!.by_nested![key] },
    //             by_month: animales!.by_month,
    //         });
    //     });
    // }

    return virtual;
}
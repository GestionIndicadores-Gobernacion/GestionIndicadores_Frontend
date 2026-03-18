import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';
import { getCategoryDisplayName, getMetricDisplayName } from '../../../../../../core/data/indicator-display-names';

export function getAtencionVeterinariaVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const insumos = raw.find(i => i.indicator_id === 100);
    const espacio = raw.find(i => i.indicator_id === 102);
    const animales = raw.find(i => i.indicator_id === 125);
    const byLocNested = indicatorsAggregate?.by_location_nested ?? [];
    const byLoc = indicatorsAggregate?.by_location ?? [];

    // 1. Jornadas con insumos vs sin insumos
    if (insumos?.by_category?.length) {
        virtual.push({
            indicator_id: -10001,
            indicator_name: 'Cantidad de jornadas con insumos vs sin insumos',
            field_type: 'by_category',
            by_category: insumos.by_category,
        });
    }

    // 2. Tipo de espacio / albergues atendidos
    if (espacio?.by_category?.length) {
        virtual.push({
            indicator_id: -10002,
            indicator_name: 'Cantidad de albergues atendidos',
            field_type: 'by_category',
            by_category: espacio.by_category,
        });
    }

    // 3. Cantidad de refugios vs meses
    if (espacio?.by_month?.length) {
        virtual.push({
            indicator_id: -10003,
            indicator_name: 'Cantidad de refugios vs meses',
            field_type: 'by_month_sum',
            by_month: espacio.by_month,
        });
    }

    // 4. Cantidad de animales atendidos vs meses
    if (animales?.by_month?.length) {
        virtual.push({
            indicator_id: -10004,
            indicator_name: 'Cantidad de animales atendidos vs meses',
            field_type: 'by_month_sum',
            by_month: animales.by_month,
        });
    }

    // 5. Cantidad de perros atendidos
    if (animales?.by_nested?.['CANINO']) {
        const total = animales.by_nested['CANINO']
            .find(r => r.metric === 'no_de_animales_con_atencion_veterinaria')?.total ?? 0;
        if (total > 0) {
            virtual.push({
                indicator_id: -10030,
                indicator_name: 'Cantidad de perros atendidos',
                field_type: 'by_category',
                by_category: [{ category: 'Caninos', total }],
            });
        }
    }

    // 6. Cantidad de gatos atendidos
    if (animales?.by_nested?.['FELINO']) {
        const total = animales.by_nested['FELINO']
            .find(r => r.metric === 'no_de_animales_con_atencion_veterinaria')?.total ?? 0;
        if (total > 0) {
            virtual.push({
                indicator_id: -10031,
                indicator_name: 'Cantidad de gatos atendidos',
                field_type: 'by_category',
                by_category: [{ category: 'Felinos', total }],
            });
        }
    }

    // 7. Cantidad de hembras (perros + gatos)
    if (animales?.by_nested) {
        const hembraKeys = Object.keys(animales.by_nested)
            .filter(k => k.includes(' – Hembra') || k.includes(' – Hembra,'));

        const byCategHembra = hembraKeys
            .map(key => {
                const rows = animales.by_nested![key];
                if (!rows) return null;
                const total = rows.find(r => r.metric === 'no_de_animales_con_atencion_veterinaria')?.total ?? 0;
                const label = key.replace(' – Hembra,', '').replace(' – Hembra', '');
                return total > 0 ? { category: `${getCategoryDisplayName(label + ' atendidos')} hembra`, total } : null;
            })
            .filter(Boolean) as { category: string; total: number }[];

        if (byCategHembra.length) {
            virtual.push({
                indicator_id: -10032,
                indicator_name: 'Cantidad de hembras atendidas',
                field_type: 'by_category',
                by_category: byCategHembra,
            });
        }
    }

    // 8. Cantidad de machos (perros + gatos)
    if (animales?.by_nested) {
        const machoKeys = Object.keys(animales.by_nested)
            .filter(k => k.includes(' – Macho'));

        const byCategMacho = machoKeys
            .map(key => {
                const rows = animales.by_nested![key];
                if (!rows) return null;
                const total = rows.find(r => r.metric === 'no_de_animales_con_atencion_veterinaria')?.total ?? 0;
                const label = key.replace(' – Macho', '');
                return total > 0 ? { category: `${getCategoryDisplayName(label + ' atendidos')} macho`, total } : null;
            })
            .filter(Boolean) as { category: string; total: number }[];

        if (byCategMacho.length) {
            virtual.push({
                indicator_id: -10033,
                indicator_name: 'Cantidad de machos atendidos',
                field_type: 'by_category',
                by_category: byCategMacho,
            });
        }
    }

    // 9. Cantidad de animales / tipo de atención vs municipios
    if (byLocNested.length > 0) {
        const locationData = byLocNested
            .map(l => {
                const ind = l.indicators.find(i => i.indicator_id === 125);
                if (!ind) return null;
                const total = ind.metrics
                    .find(m => m.metric === 'no_de_animales_con_atencion_veterinaria')?.total ?? 0;
                return total > 0 ? { location: l.location, total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationData.length > 0) {
            virtual.push({
                indicator_id: -10021,
                indicator_name: 'Cantidad de animales / tipo de atención vs municipios',
                field_type: 'by_location',
                by_location: locationData,
            });
        }
    }

    // 10. Tipo de atención vs municipios (por métrica)
    if (byLocNested.length > 0) {
        const metricas = [
            { metric: 'no_de_animales_esterilizados',            label: 'Esterilizados vs municipios' },
            { metric: 'no_de_animales_desparasitados',           label: 'Desparasitados vs municipios' },
            { metric: 'no_de_animales_con_atencion_veterinaria', label: 'Atención veterinaria vs municipios' },
            { metric: 'no_de_animales_vitaminizados',            label: 'Vitaminizados vs municipios' },
            { metric: 'no_de_animales_vacunados',                label: 'Vacunados vs municipios' },
        ];

        metricas.forEach(({ metric, label }, idx) => {
            const locData = byLocNested
                .map(l => {
                    const ind = l.indicators.find(i => i.indicator_id === 125);
                    if (!ind) return null;
                    const m = ind.metrics.find(m => m.metric === metric);
                    return m && m.total > 0 ? { location: l.location, total: m.total } : null;
                })
                .filter(Boolean) as { location: string; total: number }[];

            if (locData.length > 0) {
                virtual.push({
                    indicator_id: -(10010 + idx),
                    indicator_name: label,
                    field_type: 'by_location',
                    by_location: locData,
                });
            }
        });
    }

    // 11. Albergues atendidos por municipio
    if (byLoc.length > 0) {
        virtual.push({
            indicator_id: -10020,
            indicator_name: 'Albergues atendidos por municipio',
            field_type: 'by_location',
            by_location: byLoc,
        });
    }

    return virtual;
}
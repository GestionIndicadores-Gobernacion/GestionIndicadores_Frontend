import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../features/report/models/report-aggregate.model';

export function getPromotoresVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];
    const byLocationIndicator = indicatorsAggregate?.by_location_indicator ?? [];

    const personasCapacitadas = raw.find(i => i.indicator_id === 76);
    const tematicas = raw.find(i => i.indicator_id === 77);
    const ninosNinas = raw.find(i => i.indicator_id === 163);
    const tematicasNinos = raw.find(i => i.indicator_id === 164);

    // 1. Personas capacitadas vs meses
    if (personasCapacitadas?.by_month?.length) {
        virtual.push({
            indicator_id: -22001,
            indicator_name: 'Personas capacitadas vs meses',
            field_type: 'by_month_sum',
            by_month: personasCapacitadas.by_month,
            navigable: true,
        });
    }

    // 2. Niños y niñas capacitados vs meses
    if (ninosNinas?.by_month?.length) {
        virtual.push({
            indicator_id: -22002,
            indicator_name: 'Niños y niñas capacitados vs meses',
            field_type: 'by_month_sum',
            by_month: ninosNinas.by_month,
            navigable: true,
        });
    }

    // 3. Niños y niñas por categoría (Niños vs Niñas)
    if (ninosNinas?.by_category?.length) {
        virtual.push({
            indicator_id: -22003,
            indicator_name: 'Niños vs niñas capacitados',
            field_type: 'by_category',
            by_category: ninosNinas.by_category,
        });
    }

    // 4. Temáticas implementadas (personas capacitadas)
    if (tematicas?.by_category?.length) {
        virtual.push({
            indicator_id: -22004,
            indicator_name: 'Temáticas implementadas',
            field_type: 'by_category',
            by_category: tematicas.by_category,
        });
    }

    // 5. Temáticas implementadas niños (guías)
    if (tematicasNinos?.by_category?.length) {
        virtual.push({
            indicator_id: -22005,
            indicator_name: 'Guías implementadas',
            field_type: 'by_category',
            by_category: tematicasNinos.by_category,
        });
    }

    // 6. Jornadas por municipio
    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -22006,
            indicator_name: 'Jornadas por municipio',
            field_type: 'by_location',
            by_location: byLocation,
            navigable: true,
        });
    }

    // 7. Personas capacitadas por municipio
    if (byLocationIndicator.length > 0) {
        const locationPersonas = byLocationIndicator
            .map(l => {
                const match = l.indicators.find((i: any) => i.indicator_id === 76);
                return match ? { location: l.location, total: match.total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationPersonas.length > 0) {
            virtual.push({
                indicator_id: -22007,
                indicator_name: 'Personas capacitadas por municipio',
                field_type: 'by_location',
                by_location: locationPersonas,
                navigable: true,
            });
        }
    }

    // 8. Niños y niñas por municipio
    if (byLocationIndicator.length > 0) {
        const locationNinos = byLocationIndicator
            .map(l => {
                const match = l.indicators.find((i: any) => i.indicator_id === 163);
                return match ? { location: l.location, total: match.total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationNinos.length > 0) {
            virtual.push({
                indicator_id: -22008,
                indicator_name: 'Niños y niñas por municipio',
                field_type: 'by_location',
                by_location: locationNinos,
                navigable: true,
            });
        }
    }

    return virtual;
}
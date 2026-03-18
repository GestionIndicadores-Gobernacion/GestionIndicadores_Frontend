import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getExperienciasCulturalesVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];
    const byLocationIndicator = indicatorsAggregate?.by_location_indicator ?? [];

    // 1. Cantidad de experiencias / municipios (1 reporte = 1 experiencia)
    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -7001,
            indicator_name: 'Cantidad de experiencias / municipios',
            field_type: 'by_location',
            by_location: byLocation,
        });
    }

    // 2. Cantidad de personas / experiencia (cruce nombre × personas del backend)
    const cross = raw.find(i => i.indicator_id === -7002);
    if (cross?.by_category?.length) {
        virtual.push({
            indicator_id: -7002,
            indicator_name: 'Cantidad de personas / experiencia',
            field_type: 'by_category',
            by_category: cross.by_category,
        });
    }

    // 3. Personas asistentes / municipios
    if (byLocationIndicator.length > 0) {
        const locationPersonas = byLocationIndicator
            .map(l => {
                const match = l.indicators.find((i: any) => i.indicator_id === 81);
                return match ? { location: l.location, total: match.total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationPersonas.length > 0) {
            virtual.push({
                indicator_id: -7003,
                indicator_name: 'Personas asistentes / municipios',
                field_type: 'by_location',
                by_location: locationPersonas,
            });
        }
    }

    return virtual;
}
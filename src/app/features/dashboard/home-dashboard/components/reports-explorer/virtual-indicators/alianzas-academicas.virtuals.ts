// getAlianzasAcademicasVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getAlianzasAcademicasVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocationIndicator = indicatorsAggregate?.by_location_indicator ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];

    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -8002,
            indicator_name: 'Cantidad de foros realizados / municipios',
            field_type: 'by_location',
            by_location: byLocation,
            navigable: true,
        });
    }

    const locationPersonas = byLocationIndicator
        .map(l => {
            const match = l.indicators.find((i: any) => i.indicator_id === 121);
            return match ? { location: l.location, total: match.total } : null;
        })
        .filter(Boolean) as { location: string; total: number }[];

    if (locationPersonas.length > 0) {
        virtual.push({
            indicator_id: -8003,
            indicator_name: 'Cantidad de personas / municipios',
            field_type: 'by_location',
            by_location: locationPersonas,
            navigable: true,
        });
    }

    const cross = raw.find(i => i.indicator_id === -8001);
    if (cross?.by_category?.length) {
        virtual.push({
            indicator_id: -8001,
            indicator_name: 'Cantidad de personas / foro',
            field_type: 'by_category',
            by_category: cross.by_category,
        });
    }

    return virtual;
}
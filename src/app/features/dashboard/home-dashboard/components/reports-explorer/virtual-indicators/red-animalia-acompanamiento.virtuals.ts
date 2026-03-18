// getRedAnimaliaAcompanamientoVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getRedAnimaliaAcompanamientoVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];

    const actorInd = raw.find(i => i.indicator_id === 64);
    const tipoAcomp = raw.find(i => i.indicator_id === 66);

    if (actorInd?.by_month?.length) {
        virtual.push({
            indicator_id: -17001,
            indicator_name: 'Jornadas por mes',
            field_type: 'by_month_sum',
            by_month: actorInd.by_month,
            navigable: true,
        });
    }

    if (tipoAcomp?.by_category?.length) {
        virtual.push({
            indicator_id: -17002,
            indicator_name: 'Tipo de acompañamiento',
            field_type: 'by_category',
            by_category: tipoAcomp.by_category,
        });
    }

    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -17003,
            indicator_name: 'Jornadas por municipio',
            field_type: 'by_location',
            by_location: byLocation,
            navigable: true,
        });
    }

    if (actorInd?.by_category?.length) {
        virtual.push({
            indicator_id: -17004,
            indicator_name: 'Actores asistidos',
            field_type: 'by_category',
            by_category: actorInd.by_category,
        });
    }

    return virtual;
}
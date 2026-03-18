// getAlianzasEstrategicasVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getAlianzasEstrategicasVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];

    const cross = raw.find(i => i.indicator_id === -15001);
    if (cross?.by_category?.length) {
        virtual.push({
            indicator_id: -15001,
            indicator_name: 'No. de alianzas / tipo de alianza',
            field_type: 'by_category',
            by_category: cross.by_category,
        });
    }

    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -15002,
            indicator_name: 'Alianzas por municipio',
            field_type: 'by_location',
            by_location: byLocation,
            navigable: true,
        });
    }

    return virtual;
}
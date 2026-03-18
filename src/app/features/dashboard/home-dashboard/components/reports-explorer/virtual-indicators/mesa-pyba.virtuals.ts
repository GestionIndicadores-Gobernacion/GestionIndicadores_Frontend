// getMesaPybaVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getMesaPybaVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const tipoActor = raw.find(i => i.indicator_id === 129);
    const asistentes = raw.find(i => i.indicator_id === 131);

    if (tipoActor?.by_category?.length) {
        virtual.push({
            indicator_id: -4001,
            indicator_name: 'Tipo de actor / Mesas',
            field_type: 'by_category',
            by_category: tipoActor.by_category,
        });
    }

    if (asistentes?.by_month?.length) {
        virtual.push({
            indicator_id: -4002,
            indicator_name: 'Total asistentes por mes',
            field_type: 'by_month_sum',
            by_month: asistentes.by_month,
            navigable: true,
        });
    }

    return virtual;
}
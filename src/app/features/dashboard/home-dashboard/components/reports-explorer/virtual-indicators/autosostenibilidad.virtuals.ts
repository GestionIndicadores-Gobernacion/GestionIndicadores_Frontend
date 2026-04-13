// getAutosostenibilidadVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../features/report/models/report-aggregate.model';

export function getAutosostenibilidadVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];

    const tipoApoyo = raw.find(i => i.indicator_id === 145);

    if (tipoApoyo?.by_month?.length) {
        virtual.push({
            indicator_id: -14001,
            indicator_name: 'Tipo de apoyo / tiempo',
            field_type: 'by_month_sum',
            by_month: tipoApoyo.by_month,
            navigable: true,
        });
    }

    if (tipoApoyo?.by_category?.length) {
        virtual.push({
            indicator_id: -14002,
            indicator_name: 'Tipo de apoyo entregado',
            field_type: 'by_category',
            by_category: tipoApoyo.by_category,
        });
    }

    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -14003,
            indicator_name: 'Jornadas por municipio',
            field_type: 'by_location',
            by_location: byLocation,
            navigable: true,
        });
    }

    const crossActor = raw.find(i => i.indicator_id === -14004);
    if (crossActor?.by_category?.length) {
        virtual.push({
            indicator_id: -14004,
            indicator_name: 'Tipo de apoyo / actor',
            field_type: 'by_category',
            by_category: crossActor.by_category,
        });
    }

    return virtual;
}
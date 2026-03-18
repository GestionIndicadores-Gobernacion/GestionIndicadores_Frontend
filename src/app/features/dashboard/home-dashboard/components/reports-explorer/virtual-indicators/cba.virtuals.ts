import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getCbaVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const tipoDotacion = raw.find(i => i.indicator_id === 132);

    if (tipoDotacion?.by_category?.length) {
        virtual.push({
            indicator_id: -5001,
            indicator_name: 'Tipo de dotación / Centro de bienestar',
            field_type: 'by_category',
            by_category: tipoDotacion.by_category,
        });
    }

    if (tipoDotacion?.by_month?.length) {
        virtual.push({
            indicator_id: -5002,
            indicator_name: 'Dotación por tiempo',
            field_type: 'by_month_sum',
            by_month: tipoDotacion.by_month,
        });
    }

    return virtual;
}
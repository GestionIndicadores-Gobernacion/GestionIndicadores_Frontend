// getJuntasDefensorasVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../features/report/models/report-aggregate.model';

export function getJuntasDefensorasVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];

    const cantAsistentes = raw.find(i => i.indicator_id === 160);
    const juntasFormalizando = raw.find(i => i.indicator_id === 74);
    const juntasFormalizadas = raw.find(i => i.indicator_id === 126);
    const byLocInd = indicatorsAggregate?.by_location_indicator ?? [];

    virtual.push({
        indicator_id: -21000,
        indicator_name: 'Reportes por mes',
        field_type: 'by_month_reports',
        by_month: [],
        navigable: true,
    });

    if (cantAsistentes?.by_month?.length) {
        virtual.push({
            indicator_id: -21001,
            indicator_name: 'Asistencias técnicas vs meses',
            field_type: 'by_month_sum',
            by_month: cantAsistentes.by_month,
            navigable: true,
        });
    }

    if (juntasFormalizando?.by_month?.some(m => m.total > 0)) {
        virtual.push({
            indicator_id: -21002,
            indicator_name: 'Juntas en proceso de formalización vs meses',
            field_type: 'by_month_sum',
            by_month: juntasFormalizando.by_month,
            navigable: true,
        });
    }

    if (juntasFormalizadas?.by_month?.some(m => m.total > 0)) {
        virtual.push({
            indicator_id: -21003,
            indicator_name: 'Juntas formalizadas vs meses',
            field_type: 'by_month_sum',
            by_month: juntasFormalizadas.by_month,
            navigable: true,
        });
    }

    if (byLocInd.length > 0) {
        const locationData = byLocInd
            .map(l => {
                const ind = l.indicators.find(i => i.indicator_id === 160);
                return ind && ind.total > 0
                    ? { location: l.location, total: ind.total }
                    : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationData.length > 0) {
            virtual.push({
                indicator_id: -21004,
                indicator_name: 'Asistentes por municipio',
                field_type: 'by_location',
                by_location: locationData,
                navigable: true,
            });
        }
    }

    return virtual;
}
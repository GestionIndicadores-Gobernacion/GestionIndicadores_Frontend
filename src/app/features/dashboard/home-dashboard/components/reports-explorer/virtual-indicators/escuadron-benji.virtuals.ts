// getEscuadronBenjiVirtuals.ts
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getEscuadronBenjiVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocationIndicator = indicatorsAggregate?.by_location_indicator ?? [];
    const byLocation = indicatorsAggregate?.by_location ?? [];

    const ninos = raw.find(i => i.indicator_id === 114);

    if (ninos?.by_month?.length) {
        virtual.push({
            indicator_id: -11001,
            indicator_name: 'Niños impactados vs meses',
            field_type: 'by_month_sum',
            by_month: ninos.by_month,
            navigable: true,
        });
    }

    if (byLocationIndicator.length > 0) {
        const locationData = byLocationIndicator
            .map(l => {
                const match = l.indicators.find((i: any) => i.indicator_id === 114);
                return match ? { location: l.location, total: match.total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationData.length > 0) {
            virtual.push({
                indicator_id: -11002,
                indicator_name: 'Niños impactados vs municipios',
                field_type: 'by_location',
                by_location: locationData,
                navigable: true,
            });
        }
    }

    if (byLocation.length > 0) {
        virtual.push({
            indicator_id: -11004,
            indicator_name: 'Jornadas por municipio',
            field_type: 'by_location',
            by_location: byLocation,
            navigable: true,
        });
    }

    return virtual;
}
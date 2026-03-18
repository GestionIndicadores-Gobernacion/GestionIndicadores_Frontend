import { ExplorerVirtualConfig } from '../../../../../../core/data/component-explorer-config';
import { IndicatorDetail, ComponentIndicatorsAggregate } from '../../../../../../core/models/report-aggregate.model';

export function getGenericVirtuals(
    config: ExplorerVirtualConfig,
    list: IndicatorDetail[],
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const byLocation = indicatorsAggregate?.by_location ?? [];
    const byLocationIndicator = indicatorsAggregate?.by_location_indicator ?? [];

    // Jornadas por mes
    if (config.showReportesPorMes) {
        virtual.push({
            indicator_id: -2,
            indicator_name: config.jornadasPorMesLabel ?? 'Jornadas por mes',
            field_type: 'by_month_reports',
        });
    }

    // Personas asistidas por tiempo (Asistencias Técnicas)
    if (config.jornadasPorMesLabel) {
        const personasMeta = list.find(i => i.indicator_id === 96);
        if (personasMeta?.by_month?.length) {
            virtual.push({
                indicator_id: -3002,
                indicator_name: config.jornadasPorMesLabel,
                field_type: 'by_month_sum',
                by_month: personasMeta.by_month,
            });
        }
    }

    // Temas tratados por municipio (Asistencias Técnicas)
    if (config.showTemasPorMunicipio && byLocationIndicator.length > 0) {
        const temasMeta = list.find(i => i.indicator_id === 95);
        if (temasMeta) {
            const locationData = byLocationIndicator
                .map(l => {
                    const match = l.indicators.find((i: any) => i.indicator_id === 95);
                    return match ? { location: l.location, total: match.total } : null;
                })
                .filter(Boolean) as { location: string; total: number }[];

            if (locationData.length > 0) {
                virtual.push({
                    indicator_id: -3001,
                    indicator_name: 'Temas tratados por municipio',
                    field_type: 'by_location',
                    by_location: locationData,
                });
            }
        }
    }

    // Reportes por municipio
    if (config.showReportesPorMunicipio && byLocation.length > 0) {
        virtual.push({
            indicator_id: -1,
            indicator_name: config.locationLabel ?? 'Jornadas por municipio',
            field_type: 'by_location',
            by_location: byLocation,
        });
    }

    // X por municipio
    if (config.showIndicadoresPorMunicipio && byLocationIndicator.length > 0) {
        const indicatorIds = new Set(
            byLocationIndicator.flatMap(l => l.indicators.map((i: any) => i.indicator_id))
        );

        indicatorIds.forEach(indId => {
            const meta = list.find(i => i.indicator_id === indId);
            if (!meta) return;

            const locationData = byLocationIndicator
                .map(l => {
                    const match = l.indicators.find((i: any) => i.indicator_id === indId);
                    return match ? { location: l.location, total: match.total } : null;
                })
                .filter(Boolean) as { location: string; total: number }[];

            virtual.push({
                indicator_id: -(indId + 1000),
                indicator_name: meta.indicator_id === 114
                    ? 'Cantidad de niños por municipio'
                    : `${meta.indicator_name} por municipio`,
                field_type: 'by_location',
                by_location: locationData,
            });
        });
    }

    // X por mes (sum_group / grouped_data)
    list.forEach(ind => {
        if (
            (ind.field_type === 'sum_group' || ind.field_type === 'grouped_data') &&
            ind.by_month && ind.by_month.length > 0
        ) {
            virtual.push({
                indicator_id: -(ind.indicator_id + 2000),
                indicator_name: ind.indicator_id === 114
                    ? 'Cantidad de niños por mes'
                    : `${ind.indicator_name} por mes`,
                field_type: 'by_month_sum',
                by_month: ind.by_month,
            });
        }
    });

    // Subvistas por config (otros componentes)
    if (config.subViews) {
        Object.entries(config.subViews).forEach(([indIdStr, keyMap]) => {
            const indId = Number(indIdStr);
            const ind = list.find(i => i.indicator_id === indId);
            if (!ind?.by_nested) return;

            Object.entries(keyMap).forEach(([key, label], i) => {
                if (!ind.by_nested![key]) return;
                virtual.push({
                    indicator_id: -(indId + 3000 + i),
                    indicator_name: label,
                    field_type: 'categorized_subview',
                    by_nested: { [key]: ind.by_nested![key] },
                    by_month: ind.by_month,
                });
            });
        });
    }

    return virtual;
}
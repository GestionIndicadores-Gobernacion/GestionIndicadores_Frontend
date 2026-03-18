import { ComponentIndicatorsAggregate, IndicatorDetail } from "../../../../../../core/models/report-aggregate.model";

export function getDejandoHuellaVirtuals(
    indicatorsAggregate: ComponentIndicatorsAggregate | null
): IndicatorDetail[] {
    const virtual: IndicatorDetail[] = [];
    const raw = indicatorsAggregate?.indicators ?? [];
    const byLocationIndicator = indicatorsAggregate?.by_location_indicator ?? [];

    // 1. Cantidad de jóvenes inscritos / institución educativa (viene del backend)
    const crossInstituciones = raw.find(i => i.indicator_id === -6001);
    if (crossInstituciones?.by_category?.length) {
        virtual.push({
            indicator_id: -6001,
            indicator_name: 'Cantidad de jóvenes inscritos / institución educativa',
            field_type: 'by_category',
            by_category: crossInstituciones.by_category,
        });
    }

    // 2. Jóvenes inscritos / municipios
    if (byLocationIndicator.length > 0) {
        const locationDataJovenes = byLocationIndicator
            .map(l => {
                const match = l.indicators.find((i: any) => i.indicator_id === 117);
                return match ? { location: l.location, total: match.total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationDataJovenes.length > 0) {
            virtual.push({
                indicator_id: -6002,
                indicator_name: 'Jóvenes inscritos / municipios',
                field_type: 'by_location',
                by_location: locationDataJovenes,
            });
        }
    }

    // 3. Proyectos / municipios
    if (byLocationIndicator.length > 0) {
        const locationDataProyectos = byLocationIndicator
            .map(l => {
                const match = l.indicators.find((i: any) => i.indicator_id === 118);
                return match ? { location: l.location, total: match.total } : null;
            })
            .filter(Boolean) as { location: string; total: number }[];

        if (locationDataProyectos.length > 0) {
            virtual.push({
                indicator_id: -6003,
                indicator_name: 'Proyectos / municipios',
                field_type: 'by_location',
                by_location: locationDataProyectos,
            });
        }
    }

    return virtual;
}
import { ReportsKpiService } from '../../../../../../core/services/reports-kpi.service';
import { findCentroid, normalizeMunicipio } from '../../../../../../core/data/valle-geo.data';
import { ReportModel } from '../../../../../../core/models/report.model';
import { MunicipioSummary } from '../reports-map';

export function buildMunicipioSummary(
    location: string,
    reps: ReportModel[],
    componentMap: Record<number, string>,
    normalizeZone: (zone: string) => 'Urbana' | 'Rural',
    kpiService: ReportsKpiService   // ← recibe el servicio
): MunicipioSummary | null {
    const centroid = findCentroid(location);
    if (!centroid) return null;

    const urbana = reps.filter(r => normalizeZone(r.zone_type) === 'Urbana').length;
    const rural  = reps.filter(r => normalizeZone(r.zone_type) === 'Rural').length;

    const compCount = new Map<number, number>();
    for (const r of reps) compCount.set(r.component_id, (compCount.get(r.component_id) ?? 0) + 1);

    const byComponent = Array.from(compCount.entries())
        .map(([id, count]) => ({
            component_id: id,
            component_name: componentMap[id] ?? `Componente ${id}`,
            count,
        }))
        .sort((a, b) => b.count - a.count);

    const indMap = new Map<number, { id: number; name: string; field_type: string; total: number }>();

    const add = (id: number, name: string, total: number) => {
        if (total > 0) indMap.set(id, { id, name, field_type: 'number', total });
    };

    // Usa el servicio — misma lógica que las cards, garantizado
    add(-1, 'Asistencias técnicas',       kpiService.asistenciasTecnicas(reps));
    add(-2, 'Denuncias reportadas',        kpiService.denunciasReportadas(reps));
    add(-3, 'Animales esterilizados',      kpiService.animalesEsterilizados(reps));
    add(-4, 'Refugios impactados',         kpiService.refugiosImpactados(reps));
    add(-5, 'Niños sensibilizados',        kpiService.ninosSensibilizados(reps));
    add(-6, 'Emprendedores cofinanciados', kpiService.emprendedoresCofinanciados(reps));

    return {
        name: centroid.name,
        centroid,
        totalReports: reps.length,
        urbana,
        rural,
        reports: reps.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()),
        byComponent,
        indicators: Array.from(indMap.values()),
    };
}

export function buildMunicipioMap(
    reports: ReportModel[],
    componentMap: Record<number, string>,
    normalizeZone: (zone: string) => 'Urbana' | 'Rural',
    kpiService: ReportsKpiService   // ← recibe el servicio
): Map<string, MunicipioSummary> {
    const result  = new Map<string, MunicipioSummary>();
    const grouped = new Map<string, ReportModel[]>();

    for (const r of reports) {
        const key = normalizeMunicipio(r.intervention_location);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
    }

    for (const [, reps] of grouped) {
        const summary = buildMunicipioSummary(
            reps[0].intervention_location, reps, componentMap, normalizeZone, kpiService
        );
        if (summary) result.set(normalizeMunicipio(summary.name), summary);
    }

    return result;
}
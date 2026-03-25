import { ReportsKpiService } from '../../../../../../core/services/reports-kpi.service';
import { findCentroid, normalizeMunicipio } from '../../../../../../core/data/valle-geo.data';
import { ReportModel } from '../../../../../../core/models/report.model';
import { MunicipioSummary, ReportDetail } from '../reports-map.types';

export function formatIndicatorValue(
    value: any,
    fieldType: string
): string {
    if (value === null || value === undefined || value === '') return '—';

    switch (fieldType) {
        case 'number': {
            const n = Number(value);
            return isNaN(n) ? String(value) : n.toLocaleString('es-CO');
        }
        case 'select':
            return String(value).trim();

        case 'multi_select': {
            if (Array.isArray(value)) return value.join(', ');
            if (typeof value === 'string') {
                try { const p = JSON.parse(value); return Array.isArray(p) ? p.join(', ') : value; }
                catch { return value; }
            }
            return String(value);
        }
        case 'sum_group': {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const total = Object.values(value as Record<string, number>)
                    .reduce((s, v) => s + (Number(v) || 0), 0);
                return total.toLocaleString('es-CO');
            }
            return String(value);
        }
        case 'text':
        default:
            return String(value).trim();
    }
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildMunicipioSummary(
    location: string,
    reps: ReportModel[],
    componentMap: Record<number, string>,
    normalizeZone: (zone: string) => 'Urbana' | 'Rural',
    kpiService: ReportsKpiService
): MunicipioSummary | null {
    const centroid = findCentroid(location);
    if (!centroid) return null;

    const urbana = reps.filter(r => normalizeZone(r.zone_type) === 'Urbana').length;
    const rural = reps.filter(r => normalizeZone(r.zone_type) === 'Rural').length;

    // ── Por componente ────────────────────────────────────────────────────────
    const compCount = new Map<number, number>();
    for (const r of reps) compCount.set(r.component_id, (compCount.get(r.component_id) ?? 0) + 1);

    const byComponent = Array.from(compCount.entries())
        .map(([id, count]) => ({
            component_id: id,
            component_name: componentMap[id] ?? `Componente ${id}`,
            count,
        }))
        .sort((a, b) => b.count - a.count);

    // ── KPIs resumen ──────────────────────────────────────────────────────────
    const indMap = new Map<number, { id: number; name: string; field_type: string; total: number }>();
    const add = (id: number, name: string, total: number) => {
        if (total > 0) indMap.set(id, { id, name, field_type: 'number', total });
    };

    add(-1, 'Asistencias técnicas', kpiService.asistenciasTecnicas(reps));
    add(-2, 'Denuncias reportadas', kpiService.denunciasReportadas(reps));
    add(-3, 'Animales esterilizados', kpiService.animalesEsterilizados(reps));
    add(-4, 'Refugios impactados', kpiService.refugiosImpactados(reps));
    add(-5, 'Niños sensibilizados', kpiService.ninosSensibilizados(reps));
    add(-6, 'Emprendedores cofinanciados', kpiService.emprendedoresCofinanciados(reps));

    // ── Detalle completo por reporte ──────────────────────────────────────────
    const reportDetails: ReportDetail[] = reps
        .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())
        .map(r => ({
            id: r.id,
            report_date: r.report_date,
            component_name: componentMap[r.component_id] ?? `Componente ${r.component_id}`,
            zone_type: normalizeZone(r.zone_type),
            executive_summary: r.executive_summary,
            evidence_link: r.evidence_link ?? null,
            indicator_details: (r.indicator_values ?? [])
                .filter(iv => iv.value !== null && iv.value !== undefined && iv.value !== '')
                .map(iv => {
                    // Nombre: viene del backend si indicator está populado, sino fallback
                    const name = iv.indicator?.name ?? `Indicador ${iv.indicator_id}`;
                    const fieldType = iv.indicator?.field_type ?? 'text';
                    return {
                        indicator_id: iv.indicator_id,
                        name,
                        field_type: fieldType,
                        raw_value: iv.value,
                        formatted_value: formatIndicatorValue(iv.value, fieldType),
                    };
                }),
        }));

    // ── Indicadores numéricos agrupados por componente ────────────────────────
    const compIndicators = new Map<number, {
        component_name: string;
        indicators: { id: number; name: string; total: number }[];
    }>();

    for (const r of reps) {
        for (const iv of r.indicator_values ?? []) {
            if (iv.value === null || iv.value === undefined) continue;
            const fieldType = iv.indicator?.field_type ?? 'text';
            if (fieldType !== 'number' && fieldType !== 'sum_group') continue;

            const n = fieldType === 'number'
                ? Number(iv.value)
                : Object.values(iv.value as Record<string, number>)
                    .reduce((s, v) => s + (Number(v) || 0), 0);
            if (isNaN(n) || n <= 0) continue;

            const compName = componentMap[r.component_id] ?? `Componente ${r.component_id}`;
            const indName = iv.indicator?.name ?? `Indicador ${iv.indicator_id}`;

            if (!compIndicators.has(r.component_id)) {
                compIndicators.set(r.component_id, { component_name: compName, indicators: [] });
            }
            const comp = compIndicators.get(r.component_id)!;
            const existing = comp.indicators.find(i => i.id === iv.indicator_id);
            if (existing) existing.total += n;
            else comp.indicators.push({ id: iv.indicator_id, name: indName, total: n });
        }
    }

    return {
        name: centroid.name,
        centroid,
        totalReports: reps.length,
        urbana,
        rural,
        reports: reps.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()),
        byComponent,
        indicators: Array.from(indMap.values()),
        reportDetails,
        indicatorsByComponent: Array.from(compIndicators.values()),
    };
}

export function buildMunicipioMap(
    reports: ReportModel[],
    componentMap: Record<number, string>,
    normalizeZone: (zone: string) => 'Urbana' | 'Rural',
    kpiService: ReportsKpiService
): Map<string, MunicipioSummary> {
    const result = new Map<string, MunicipioSummary>();
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
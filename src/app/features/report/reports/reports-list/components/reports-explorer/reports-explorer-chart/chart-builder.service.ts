import { Injectable } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { ComponentAggregate, IndicatorDetail } from '../../../../../../../core/models/report-aggregate.model';
import { getMetricDisplayName } from '../../../../../../../core/data/indicator-display-names';

export interface ChartResult {
    type: ChartType;
    data: ChartConfiguration['data'];
    options: ChartConfiguration['options'];
}

export interface BarClickEvent {
    label: string;
    datasetLabel: string;
    componentId: number | null;
    indicatorId: number | null;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DONUT_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#22c55e'];

@Injectable({ providedIn: 'root' })
export class ChartBuildersService {

    buildForIndicator(
        d: IndicatorDetail | null,
        aggregate: ComponentAggregate,
        year: number,
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null = null,
    ): ChartResult {

        if (!d || d.field_type === 'by_month_reports') {
            return this.jornadas(aggregate, year, onBarClick, componentId);
        }
        if (d.by_nested) return this.donut(d, onBarClick, componentId);
        if (d.by_location) return this.location(d, onBarClick, componentId);
        if (d.by_category) return this.category(d, onBarClick, componentId);
        if (d.by_month) return this.month(d, year, onBarClick, componentId);

        return this.jornadas(aggregate, year, onBarClick, componentId);
    }

    // ─── Builders ────────────────────────────────────────────────

    private jornadas(
        aggregate: ComponentAggregate,
        year: number,
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null,
    ): ChartResult {

        const map: Record<string, number> = {};
        aggregate.by_month
            .filter(e => this.getYear(e.month) === year)
            .forEach(e => {
                const total = (e as any).total ?? ((e as any).urbana ?? 0) + ((e as any).rural ?? 0);
                if (total > 0) map[e.month] = total;
            });

        const labels = MONTHS;
        const data = MONTHS.map((_, i) => map[this.monthKey(year, i)] ?? 0);

        return {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Jornadas', data, backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 4, barThickness: 32 }]
            },
            options: {
                ...this.baseOptions(false, false),
                onClick: (_e: any, elements: any[]) => {
                    if (!elements.length) return;
                    onBarClick({ label: labels[elements[0].index], datasetLabel: 'Jornadas', componentId, indicatorId: null });
                }
            }
        };
    }

    private month(
        d: IndicatorDetail,
        year: number,
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null,
    ): ChartResult {

        const map: Record<string, number> = {};
        d.by_month!.filter(e => this.getYear(e.month) === year).forEach(e => map[e.month] = e.total);

        const data = MONTHS.map((_, i) => map[this.monthKey(year, i)] ?? 0);

        return {
            type: 'bar',
            data: {
                labels: MONTHS,
                datasets: [{ label: d.indicator_name, data, backgroundColor: 'rgba(245,158,11,.85)', borderRadius: 4, barThickness: 28 }]
            },
            options: {
                ...this.baseOptions(false, false),
                onClick: (_e: any, elements: any[]) => {
                    if (!elements.length) return;
                    onBarClick({ label: MONTHS[elements[0].index], datasetLabel: d.indicator_name, componentId, indicatorId: d.indicator_id });
                }
            }
        };
    }

    private category(
        d: IndicatorDetail,
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null,
    ): ChartResult {

        const c = d.by_category!;
        if (c.length <= 6) {
            return this.donutFromArray(c.map(x => x.category), c.map(x => x.total), onBarClick, componentId, d.indicator_id);
        }

        return {
            type: 'bar',
            data: {
                labels: c.map(x => x.category),
                datasets: [{ label: d.indicator_name, data: c.map(x => x.total), backgroundColor: 'rgba(99,102,241,.8)', borderRadius: 4 }]
            },
            options: {
                ...this.baseOptions(true, true),
                onClick: (_e: any, elements: any[]) => {
                    if (!elements.length) return;
                    onBarClick({ label: c[elements[0].index].category, datasetLabel: d.indicator_name, componentId, indicatorId: d.indicator_id });
                }
            }
        };
    }

    private location(
        d: IndicatorDetail,
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null,
    ): ChartResult {

        const l = d.by_location!.filter(x => x.total > 0);

        return {
            type: 'bar',
            data: {
                labels: l.map(x => x.location),
                datasets: [{ label: d.indicator_name, data: l.map(x => x.total), backgroundColor: 'rgba(99,102,241,.85)', borderRadius: 6, barThickness: 18 }]
            },
            options: {
                ...this.baseOptions(true, true),
                onClick: (_e: any, elements: any[]) => {
                    if (!elements.length) return;
                    onBarClick({ label: l[elements[0].index].location, datasetLabel: d.indicator_name, componentId, indicatorId: d.indicator_id });
                }
            }
        };
    }

    private donut(
        d: IndicatorDetail,
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null,
    ): ChartResult {

        const k = Object.keys(d.by_nested!)[0];
        const arr = d.by_nested![k];
        return this.donutFromArray(
            arr.map(x => getMetricDisplayName(x.metric)),
            arr.map(x => x.total),
            onBarClick, componentId, d.indicator_id
        );
    }

    private donutFromArray(
        labels: string[],
        values: number[],
        onBarClick: (e: BarClickEvent) => void,
        componentId: number | null,
        indicatorId: number | null = null,
    ): ChartResult {

        const total = values.reduce((a, b) => a + b, 0);

        return {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: labels.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]) }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (_e: any, elements: any[]) => {
                    if (!elements.length) return;
                    onBarClick({ label: labels[elements[0].index], datasetLabel: '', componentId, indicatorId });
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            generateLabels: (chart) => {
                                const ds = chart.data.datasets[0];
                                return chart.data.labels!.map((l, i) => {
                                    const v = (ds.data[i] as number) || 0;
                                    const p = total ? ((v / total) * 100).toFixed(1) : 0;
                                    return { text: `${l}: ${v.toLocaleString()} (${p}%)`, fillStyle: (ds.backgroundColor as any[])[i], index: i };
                                });
                            }
                        }
                    }
                }
            }
        };
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private baseOptions(showLegend: boolean, horizontal: boolean): ChartConfiguration['options'] {
        return {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: horizontal ? 'y' : 'x',
            interaction: { mode: 'nearest', intersect: true },
            plugins: {
                legend: { display: showLegend },
                tooltip: {
                    mode: 'nearest', intersect: true,
                    callbacks: {
                        label: (ctx) => {
                            const label = ctx.dataset.label ?? '';
                            const value = horizontal ? (ctx.parsed.x ?? 0) : (ctx.parsed.y ?? 0);
                            return `${label}: ${value.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: horizontal
                ? { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { type: 'category' } }
                : { x: { type: 'category' }, y: { beginAtZero: true, ticks: { precision: 0 } } }
        };
    }

    private getYear(m: string) { return Number(m.split('-')[0]); }
    private monthKey(year: number, i: number) { return `${year}-${String(i + 1).padStart(2, '0')}`; }
}
import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewerData, DatasetService } from '../../../../../features/datasets/services/datasets.service';
import { DashboardData } from '../../table-viewer/table-viewer';
import { DashboardCompletenessComponent } from '../../visualizations/dashboard-completeness/dashboard-completeness';

interface RecordData { [key: string]: any; }

@Component({
    selector: 'app-personas-capacitadas-view',
    standalone: true,
    imports: [CommonModule, DashboardCompletenessComponent],
    templateUrl: './view.html'
})
export class PersonasCapacitadasViewComponent implements OnInit, OnDestroy {
    @Input() data!: DashboardData;

    viewerData = signal<ViewerData | null>(null);
    mesActivo = signal<string>('todos');

    private charts: Record<string, any> = {};
    private ChartJS: any = null;

    constructor(private datasetService: DatasetService) { }

    ngOnInit(): void {
        this.datasetService.getTableViewer(this.data.table.id).subscribe({
            next: d => {
                this.viewerData.set(d);
                setTimeout(() => this.renderAll(), 150);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroyAll();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private isYes(val: any): boolean {
        return ['si', 'sí', 'yes', '1', 'true', 'x'].includes(String(val ?? '').toLowerCase().trim());
    }

    private isTotalRow(r: any): boolean {
        // La fila de totales tiene números en campos que deberían ser 'Si'
        const d = r.data;
        return typeof d['mujer'] === 'number' || typeof d['hombre'] === 'number';
    }

    // ─── Registros filtrados por mes ──────────────────────────────────────────

    filteredRecords = computed(() => {
        const d = this.viewerData();
        if (!d) return [];
        const mes = this.mesActivo();
        return d.records
            .filter(r => !this.isTotalRow(r))
            .filter(r => mes === 'todos' || String(r.data['mes'] ?? '').toLowerCase() === mes.toLowerCase());
    });

    // ─── KPIs calculados ─────────────────────────────────────────────────────

    kpis = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length;
        const mujer = recs.filter(r => this.isYes(r.data['mujer'])).length;
        const hombre = recs.filter(r => this.isYes(r.data['hombre'])).length;
        const sinGenero = total - mujer - hombre;
        return { total, mujer, hombre, sinGenero };
    });

    // ─── Meses disponibles ────────────────────────────────────────────────────

    meses = computed(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.filter(r => !this.isTotalRow(r)).forEach(r => {
            const m = String(r.data['mes'] ?? '').trim();
            if (m) set.add(m);
        });
        return Array.from(set).sort();
    });

    // ─── Datos para gráficas ──────────────────────────────────────────────────

    munData = computed(() => {
        const counts: Record<string, number> = {};
        this.filteredRecords().forEach(r => {
            const m = String(r.data['municipio'] ?? '').trim().toLowerCase();
            if (m) counts[m] = (counts[m] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value }));
    });

    generoData = computed(() => {
        const k = this.kpis();
        return [
            { label: 'Mujer', value: k.mujer, color: '#D4537E' },
            { label: 'Hombre', value: k.hombre, color: '#185FA5' },
            { label: 'No registrado', value: k.sinGenero, color: '#888780' },
        ].filter(s => s.value > 0);
    });

    zonaData = computed(() => {
        const recs = this.filteredRecords();
        const urbana = recs.filter(r => this.isYes(r.data['urbana'])).length;
        const rural = recs.filter(r => this.isYes(r.data['rural'])).length;
        const sinZona = recs.length - urbana - rural;
        return [
            { label: 'Urbana', value: urbana, color: '#1D9E75' },
            { label: 'Rural', value: rural, color: '#BA7517' },
            { label: 'No registrado', value: sinZona, color: '#888780' },
        ].filter(s => s.value > 0);
    });

    guiasData = computed(() => {
        const recs = this.filteredRecords();
        return [
            { label: 'Guía 1', value: recs.filter(r => this.isYes(r.data['guia_1'])).length, color: '#534AB7' },
            { label: 'Guía 2', value: recs.filter(r => this.isYes(r.data['guia_2'])).length, color: '#D85A30' },
            { label: 'Guía 3', value: recs.filter(r => this.isYes(r.data['guia_3'])).length, color: '#1D9E75' },
        ];
    });

    contactData = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length || 1;
        const tel = recs.filter(r => r.data['telefono']).length;
        const correo = recs.filter(r => r.data['correo_electronico']).length;
        return [
            { label: 'Teléfono', value: Math.round(tel / total * 100), pct: Math.round(tel / total * 100), color: '' },
            { label: 'Correo electrónico', value: Math.round(correo / total * 100), pct: Math.round(correo / total * 100), color: '' },
        ];
    });

    // ─── Filtro mes ───────────────────────────────────────────────────────────

    setMes(mes: string): void {
        this.mesActivo.set(mes);
        setTimeout(() => this.renderAll(), 50);
    }

    // ─── Chart.js ────────────────────────────────────────────────────────────

    private destroyAll(): void {
        Object.values(this.charts).forEach((c: any) => c?.destroy());
        this.charts = {};
    }

    private destroyChart(id: string): void {
        if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; }
    }

    private async loadChart(): Promise<any> {
        if (this.ChartJS) return this.ChartJS;
        const mod = await import('chart.js');
        mod.Chart.register(...mod.registerables);
        this.ChartJS = mod.Chart;
        return this.ChartJS;
    }

    async renderAll(): Promise<void> {
        const Chart = await this.loadChart();
        this.destroyAll();
        this.renderMun(Chart);
        this.renderDonut('cvGenero', this.generoData(), Chart);
        this.renderDonut('cvZona', this.zonaData(), Chart);
        this.renderGuias(Chart);
    }

    private renderMun(Chart: any): void {
        const el = document.getElementById('cvMun') as HTMLCanvasElement;
        if (!el) return;
        const data = this.munData();
        this.charts['cvMun'] = new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: '#185FA5',
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} personas` } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888780', maxRotation: 40 } },
                    y: { grid: { color: 'rgba(136,135,128,0.15)' }, ticks: { font: { size: 11 }, color: '#888780' } }
                }
            }
        });
    }

    private renderDonut(id: string, segments: { label: string; value: number; color: string }[], Chart: any): void {
        const el = document.getElementById(id) as HTMLCanvasElement;
        if (!el || !segments.length) return;
        this.charts[id] = new Chart(el, {
            type: 'doughnut',
            data: {
                labels: segments.map(s => s.label),
                datasets: [{
                    data: segments.map(s => s.value),
                    backgroundColor: segments.map(s => s.color),
                    borderWidth: 2,
                    borderColor: 'transparent',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw}` } }
                }
            }
        });
    }

    private renderGuias(Chart: any): void {
        const el = document.getElementById('cvGuias') as HTMLCanvasElement;
        if (!el) return;
        const data = this.guiasData();
        this.charts['cvGuias'] = new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} personas` } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 12 }, color: '#888780' } },
                    y: { grid: { color: 'rgba(136,135,128,0.15)' }, ticks: { font: { size: 11 }, color: '#888780' } }
                }
            }
        });
    }
}
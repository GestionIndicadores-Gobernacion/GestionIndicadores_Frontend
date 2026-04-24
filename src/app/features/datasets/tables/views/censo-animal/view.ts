import {
    AfterViewInit,
    ChangeDetectionStrategy, ChangeDetectorRef,
    Component, DestroyRef, Input, OnInit, OnDestroy,
    signal, computed, inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ViewerData, DatasetService } from '../../../../../features/datasets/services/datasets.service';
import { DashboardData } from '../../table-viewer/table-viewer';
import { DashboardCompletenessComponent } from '../../visualizations/dashboard-completeness/dashboard-completeness';

interface RecRow { id: number; data: Record<string, any>; }

interface MunicipioRow {
    id: number;
    municipio: string;
    poblacion_perros: number;
    poblacion_gatos: number;
    total_animales: number;
    viviendas: number;
    perros_reportados: number;
    gatos_reportados: number;
    vta: number;
    ratio_perros: number;
    ratio_gatos: number;
    cobertura_pct: number;
    pob_ajustada: number;
}

const TOTAL_KEYWORDS = ['valle del cauca', 'valle', 'total'];

@Component({
    selector: 'app-censo-animal-view',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, DashboardCompletenessComponent],
    templateUrl: './view.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CensoAnimalViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() data!: DashboardData;

    viewerData = signal<ViewerData | null>(null);
    loading = signal(true);

    filterMunicipio = signal('');
    filterMin = signal<number | null>(null);
    filterEspecie = signal<'' | 'perros' | 'gatos'>('');

    municipioPage = signal(1);
    municipioSearch = signal('');
    expandedMunicipioId = signal<number | null>(null);
    readonly municipioPageSize = 15;

    private charts: Record<string, any> = {};
    private ChartJS: any = null;
    private destroyRef = inject(DestroyRef);
    private cdr = inject(ChangeDetectorRef);

    constructor(private ds: DatasetService) { }

    private viewReady = false;
    private pendingRender = false;

    ngOnInit(): void {
        this.ds.getTableViewer(this.data.table.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: d => {
                    this.viewerData.set(d);
                    this.loading.set(false);
                    this.cdr.markForCheck();
                    this.scheduleRender();
                },
                error: () => { this.loading.set(false); this.cdr.markForCheck(); },
            });
    }

    /**
     * AfterViewInit garantiza que la vista del componente ya pasó por
     * su primer ciclo de CD: los <canvas> dentro del [hidden] o *ngIf
     * están en el DOM con dimensiones reales.
     */
    ngAfterViewInit(): void {
        this.viewReady = true;
        if (this.pendingRender) {
            this.pendingRender = false;
            this.renderAll();
        }
    }

    ngOnDestroy(): void { this.destroyAll(); }

    /**
     * Renderiza solo cuando la vista está lista. Si los datos llegan
     * antes que ngAfterViewInit, queda pendiente y se dispara después.
     * Doble rAF asegura que el navegador completó el layout y los
     * canvas ya tienen offsetWidth/offsetHeight reales.
     */
    private scheduleRender(): void {
        if (!this.viewReady) {
            this.pendingRender = true;
            return;
        }
        requestAnimationFrame(() =>
            requestAnimationFrame(() => this.renderAll())
        );
    }

    /**
     * Toma el canvas, valida dimensiones reales y ejecuta el builder.
     * Tras instanciar invoca resize() para el primer paint correcto.
     */
    private withCanvas(id: string, _attempt: number, fn: (el: HTMLCanvasElement) => void): void {
        const el = document.getElementById(id) as HTMLCanvasElement | null;
        if (!el) return;
        const parent = el.parentElement;
        if (!parent || parent.offsetWidth === 0) return;
        fn(el);
        const chart = this.charts[id];
        if (chart && typeof chart.resize === 'function') chart.resize();
    }

    // ─── Helpers ──────────────────────────────────────────────────────
    private f(row: Record<string, any>, ...keywords: string[]): any {
        for (const key of Object.keys(row)) {
            const k = key.toLowerCase();
            if (keywords.every(kw => k.includes(kw))) return row[key];
        }
        return null;
    }
    private num(v: any): number {
        if (v == null || v === '') return 0;
        const n = Number(v); return isNaN(n) ? 0 : n;
    }
    private str(v: any): string { return v == null ? '' : String(v).trim(); }
    private norm(v: any): string { return this.str(v).toLowerCase(); }

    private isTotalRow(r: RecRow): boolean {
        const m = this.norm(this.f(r.data, 'municipio'));
        return TOTAL_KEYWORDS.includes(m);
    }

    // ─── Records (excluyendo fila TOTAL) ─────────────────────────────
    rawMunicipios = computed<RecRow[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        return d.records.filter(r => !this.isTotalRow(r) && this.str(this.f(r.data, 'municipio')));
    });

    totalRow = computed<RecRow | null>(() => {
        const d = this.viewerData();
        if (!d) return null;
        return d.records.find(r => this.isTotalRow(r)) ?? null;
    });

    filteredRecords = computed<RecRow[]>(() => {
        const mun = this.filterMunicipio().toLowerCase();
        const min = this.filterMin();
        const esp = this.filterEspecie();

        return this.rawMunicipios().filter(r => {
            if (mun && this.norm(this.f(r.data, 'municipio')) !== mun) return false;
            const perros = this.num(this.f(r.data, 'poblacion', 'perros'));
            const gatos = this.num(this.f(r.data, 'poblacion', 'gatos'));
            if (min != null) {
                const total = perros + gatos;
                if (total < min) return false;
            }
            if (esp === 'perros' && perros <= 0) return false;
            if (esp === 'gatos' && gatos <= 0) return false;
            return true;
        });
    });

    municipios = computed<string[]>(() => {
        const set = new Set<string>();
        this.rawMunicipios().forEach(r => {
            const m = this.str(this.f(r.data, 'municipio'));
            if (m) set.add(m);
        });
        return Array.from(set).sort();
    });

    // ─── KPIs ─────────────────────────────────────────────────────────
    kpis = computed(() => {
        const recs = this.filteredRecords();
        let perros = 0, gatos = 0, viviendas = 0, vta = 0, encuestados = 0;
        recs.forEach(r => {
            perros += this.num(this.f(r.data, 'poblacion', 'perros'));
            gatos += this.num(this.f(r.data, 'poblacion', 'gatos'));
            const v = this.num(this.f(r.data, 'viviendas'));
            viviendas += v;
            if (v > 0) encuestados++;
            vta += this.num(this.f(r.data, 'vta'));
        });
        const totalAnimales = perros + gatos;
        return {
            municipios: recs.length,
            encuestados, perros, gatos, totalAnimales, viviendas, vta,
            promPerrosViv: viviendas ? (perros / viviendas) : 0,
            promGatosViv: viviendas ? (gatos / viviendas) : 0,
            cobertura: recs.length ? Math.round(encuestados / recs.length * 100) : 0,
        };
    });

    // ─── Charts data ──────────────────────────────────────────────────
    perrosMunData = computed(() => {
        const recs = this.filteredRecords()
            .map(r => ({
                label: this.str(this.f(r.data, 'municipio')),
                value: this.num(this.f(r.data, 'poblacion', 'perros')),
            }))
            .filter(x => x.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 12);
        return recs.map(d => ({ ...d, value: Math.round(d.value) }));
    });

    gatosMunData = computed(() => {
        const recs = this.filteredRecords()
            .map(r => ({
                label: this.str(this.f(r.data, 'municipio')),
                value: this.num(this.f(r.data, 'poblacion', 'gatos')),
            }))
            .filter(x => x.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 12);
        return recs.map(d => ({ ...d, value: Math.round(d.value) }));
    });

    composicionData = computed(() => {
        const k = this.kpis();
        return [
            { label: 'Perros', value: Math.round(k.perros), color: '#0891B2',
              pct: k.totalAnimales ? Math.round(k.perros / k.totalAnimales * 100) : 0 },
            { label: 'Gatos', value: Math.round(k.gatos), color: '#F59E0B',
              pct: k.totalAnimales ? Math.round(k.gatos / k.totalAnimales * 100) : 0 },
        ].filter(s => s.value > 0);
    });

    densidadData = computed(() => {
        // Top 10 municipios por densidad (animales/vivienda)
        return this.filteredRecords()
            .map(r => {
                const perros = this.num(this.f(r.data, 'poblacion', 'perros'));
                const gatos = this.num(this.f(r.data, 'poblacion', 'gatos'));
                const viv = this.num(this.f(r.data, 'viviendas'));
                return {
                    label: this.str(this.f(r.data, 'municipio')),
                    value: viv > 0 ? Math.round((perros + gatos) / viv * 100) / 100 : 0,
                };
            })
            .filter(x => x.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    });

    coberturaData = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length || 1;
        const conViviendas = recs.filter(r => this.num(this.f(r.data, 'viviendas')) > 0).length;
        const conPerros = recs.filter(r => this.num(this.f(r.data, 'poblacion', 'perros')) > 0).length;
        const conGatos = recs.filter(r => this.num(this.f(r.data, 'poblacion', 'gatos')) > 0).length;
        const conVta = recs.filter(r => this.num(this.f(r.data, 'vta')) > 0).length;
        return [
            { label: 'Viviendas encuestadas', value: Math.round(conViviendas / total * 100),
              pct: Math.round(conViviendas / total * 100), color: '#0891B2' },
            { label: 'Perros reportados', value: Math.round(conPerros / total * 100),
              pct: Math.round(conPerros / total * 100), color: '#06B6D4' },
            { label: 'Gatos reportados', value: Math.round(conGatos / total * 100),
              pct: Math.round(conGatos / total * 100), color: '#F59E0B' },
            { label: 'VTA registrada', value: Math.round(conVta / total * 100),
              pct: Math.round(conVta / total * 100), color: '#0D9488' },
        ];
    });

    // ─── Tabla municipios (con detalle expandible) ───────────────────
    private buildMunicipioRow(r: RecRow): MunicipioRow {
        const municipio = this.str(this.f(r.data, 'municipio'));
        const perros = this.num(this.f(r.data, 'poblacion', 'perros'));
        const gatos = this.num(this.f(r.data, 'poblacion', 'gatos'));
        const viviendas = this.num(this.f(r.data, 'viviendas'));
        const perrosRep = this.num(this.f(r.data, 'perros', 'reportados'));
        const gatosRep = this.num(this.f(r.data, 'gatos', 'reportados'));
        const vta = this.num(this.f(r.data, 'vta'));
        const ratioP = this.num(this.f(r.data, 'perros', 'vivienda'));
        const ratioG = this.num(this.f(r.data, 'gatos', 'vivienda'));
        const pobAjustada = this.num(this.f(r.data, 'pob', 'ajustada'));
        return {
            id: r.id, municipio,
            poblacion_perros: Math.round(perros),
            poblacion_gatos: Math.round(gatos),
            total_animales: Math.round(perros + gatos),
            viviendas: Math.round(viviendas),
            perros_reportados: Math.round(perrosRep),
            gatos_reportados: Math.round(gatosRep),
            vta: Math.round(vta),
            ratio_perros: Math.round(ratioP * 100) / 100,
            ratio_gatos: Math.round(ratioG * 100) / 100,
            cobertura_pct: viviendas > 0 ? 100 : 0,
            pob_ajustada: Math.round(pobAjustada),
        };
    }

    allMunicipios = computed<MunicipioRow[]>(() =>
        this.filteredRecords().map(r => this.buildMunicipioRow(r))
            .sort((a, b) => b.total_animales - a.total_animales));

    searchedMunicipios = computed<MunicipioRow[]>(() => {
        const q = this.municipioSearch().toLowerCase().trim();
        const all = this.allMunicipios();
        if (!q) return all;
        return all.filter(m => m.municipio.toLowerCase().includes(q));
    });

    paginatedMunicipios = computed<MunicipioRow[]>(() => {
        const start = (this.municipioPage() - 1) * this.municipioPageSize;
        return this.searchedMunicipios().slice(start, start + this.municipioPageSize);
    });

    municipioTotalPages = computed(() =>
        Math.max(1, Math.ceil(this.searchedMunicipios().length / this.municipioPageSize)));

    toggleMunicipio(id: number): void {
        this.expandedMunicipioId.set(this.expandedMunicipioId() === id ? null : id);
    }
    setMunicipioPage(p: number): void { this.municipioPage.set(p); this.expandedMunicipioId.set(null); }
    onMunicipioSearch(): void { this.municipioPage.set(1); this.expandedMunicipioId.set(null); }

    applyFilters(): void {
        this.cdr.markForCheck();
        this.scheduleRender();
    }

    clearFilters(): void {
        this.filterMunicipio.set(''); this.filterMin.set(null); this.filterEspecie.set('');
        this.cdr.markForCheck();
        this.scheduleRender();
    }

    // ─── Chart.js ────────────────────────────────────────────────────
    private destroyAll(): void {
        Object.values(this.charts).forEach((c: any) => c?.destroy()); this.charts = {};
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
        this.renderPerros(Chart);
        this.renderGatos(Chart);
        this.renderComposicion(Chart);
        this.renderDensidad(Chart);
    }

    private renderPerros(Chart: any): void {
        this.withCanvas('cvCensoPerros', 0, el => {
            const data = this.perrosMunData();
            this.charts['cvCensoPerros'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: '#0891B2',
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} perros` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#666', maxRotation: 45 } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }

    private renderGatos(Chart: any): void {
        this.withCanvas('cvCensoGatos', 0, el => {
            const data = this.gatosMunData();
            this.charts['cvCensoGatos'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: '#F59E0B',
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} gatos` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#666', maxRotation: 45 } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }

    private renderComposicion(Chart: any): void {
        this.withCanvas('cvCensoComp', 0, el => {
            const segs = this.composicionData();
            if (!segs.length) return;
            this.charts['cvCensoComp'] = new Chart(el, {
                type: 'doughnut',
                data: { labels: segs.map(s => s.label),
                    datasets: [{ data: segs.map(s => s.value), backgroundColor: segs.map(s => s.color),
                                 borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '62%',
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: {
                            label: (ctx: any) => {
                                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const pct = total ? Math.round(ctx.raw / total * 100) : 0;
                                return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
                            },
                        } } },
                },
            });
        });
    }

    private renderDensidad(Chart: any): void {
        this.withCanvas('cvCensoDensidad', 0, el => {
            const data = this.densidadData();
            this.charts['cvCensoDensidad'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: '#0D9488',
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} animales/vivienda` } } },
                    scales: {
                        x: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#333' } },
                    },
                },
            });
        });
    }
}

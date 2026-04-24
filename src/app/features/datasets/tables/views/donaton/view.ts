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

interface DonanteRow {
    id: number;
    nombre: string;
    initials: string;
    municipio: string;
    fecha: string;
    mes: string;
    perro: number;
    gato: number;
    total: number;
    telefono: string;
}

const MES_KW: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9,
    octubre: 10, noviembre: 11, diciembre: 12,
};
const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
    selector: 'app-donaton-view',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, DashboardCompletenessComponent],
    templateUrl: './view.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonatonViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() data!: DashboardData;

    viewerData = signal<ViewerData | null>(null);
    loading = signal(true);

    filterMunicipio = signal('');
    filterMes = signal('');
    filterTipo = signal('');

    donantePage = signal(1);
    donanteSearch = signal('');
    expandedDonanteId = signal<number | null>(null);
    readonly donantePageSize = 15;

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
     * su primer ciclo de CD: los <canvas> dentro del *ngIf="viewerData()"
     * o [hidden]="loading()" están en el DOM con dimensiones reales.
     * Si los datos llegaron antes que la vista se inicializara, se
     * marcó `pendingRender` y aquí se dispara.
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
     * Solo renderiza cuando la vista está lista. Si los datos llegan
     * antes que ngAfterViewInit, queda pendiente y se dispara después.
     */
    private scheduleRender(): void {
        if (!this.viewReady) {
            this.pendingRender = true;
            return;
        }
        // Doble rAF: garantiza que el navegador completó el layout
        // (offsetWidth/offsetHeight reales) tras el cambio del *ngIf
        // o [hidden]. Sin esto Chart.js mide 0x0.
        requestAnimationFrame(() =>
            requestAnimationFrame(() => this.renderAll())
        );
    }

    /**
     * Toma el canvas, valida que tenga dimensiones reales y ejecuta el
     * builder. Tras instanciar el Chart se invoca resize() para forzar
     * el primer paint con dimensiones correctas (Chart.js en algunos
     * navegadores cachea 0×0 si el contenedor estaba [hidden] al medir).
     */
    private withCanvas(id: string, _attempt: number, fn: (el: HTMLCanvasElement) => void): void {
        const el = document.getElementById(id) as HTMLCanvasElement | null;
        if (!el) return;
        const parent = el.parentElement;
        // offsetParent === null cuando un ancestro tiene display:none o [hidden].
        // En ese caso medir dará 0×0 y el chart quedará invisible.
        if (!parent || parent.offsetWidth === 0) return;
        fn(el);
        // Forzar resize tras instanciar (Chart.js mide en el constructor;
        // si el layout cambió por animaciones CSS, este resize lo corrige).
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

    private rowTotal(d: Record<string, any>): number {
        const t = this.num(d['total']);
        if (t > 0) return t;
        return this.num(this.f(d, 'alimento', 'perro')) + this.num(this.f(d, 'alimento', 'gato'));
    }

    private parseFecha(v: any): { mes: number | null; anio: number | null } {
        if (!v) return { mes: null, anio: null };
        const s = String(v).trim().toLowerCase();
        if (/^\d{4}-\d{2}/.test(s)) {
            return { mes: parseInt(s.slice(5, 7), 10), anio: parseInt(s.slice(0, 4), 10) };
        }
        const tokens = s.replace(' de ', ' ').split(/\s+/);
        let mes: number | null = null, anio: number | null = null;
        for (const t of tokens) {
            if (mes == null && MES_KW[t] != null) mes = MES_KW[t];
            else if (anio == null && /^\d{4}$/.test(t)) anio = parseInt(t, 10);
        }
        return { mes, anio };
    }
    private mesLabel(mes: number | null, anio: number | null): string {
        if (mes == null || anio == null) return 'Sin fecha';
        return `${MES_CORTO[mes - 1]} ${anio}`;
    }

    // ─── Filtered records ────────────────────────────────────────────
    filteredRecords = computed<RecRow[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const mun = this.filterMunicipio().toLowerCase();
        const mes = this.filterMes();
        const tipo = this.filterTipo();
        return d.records.filter(r => {
            if (mun && this.norm(this.f(r.data, 'municipio')) !== mun) return false;
            if (mes) {
                const { mes: m, anio: a } = this.parseFecha(r.data['fecha']);
                if (this.mesLabel(m, a) !== mes) return false;
            }
            if (tipo === 'perro' && this.num(this.f(r.data, 'alimento', 'perro')) <= 0) return false;
            if (tipo === 'gato' && this.num(this.f(r.data, 'alimento', 'gato')) <= 0) return false;
            return true;
        });
    });

    municipios = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => { const v = this.str(this.f(r.data, 'municipio')); if (v) set.add(v); });
        return Array.from(set).sort();
    });

    mesesDisponibles = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => {
            const { mes, anio } = this.parseFecha(r.data['fecha']);
            if (mes != null && anio != null) set.add(this.mesLabel(mes, anio));
        });
        return Array.from(set).sort((a, b) => {
            const [ma, aa] = a.split(' '); const [mb, ab] = b.split(' ');
            if (aa !== ab) return Number(aa) - Number(ab);
            return MES_CORTO.indexOf(ma) - MES_CORTO.indexOf(mb);
        });
    });

    // ─── KPIs ─────────────────────────────────────────────────────────
    kpis = computed(() => {
        const recs = this.filteredRecords();
        let kgPerro = 0, kgGato = 0, kgTotal = 0;
        const donantes = new Set<string>();
        const munSet = new Set<string>();
        for (const r of recs) {
            kgPerro += this.num(this.f(r.data, 'alimento', 'perro'));
            kgGato += this.num(this.f(r.data, 'alimento', 'gato'));
            kgTotal += this.rowTotal(r.data);
            const n = this.norm(this.f(r.data, 'nombre')); if (n) donantes.add(n);
            const m = this.norm(this.f(r.data, 'municipio')); if (m) munSet.add(m);
        }
        return {
            total: recs.length, kgPerro, kgGato, kgTotal,
            donantes: donantes.size, municipios: munSet.size,
            promedio: recs.length ? Math.round(kgTotal / recs.length) : 0,
        };
    });

    // ─── Charts data ──────────────────────────────────────────────────
    municipioData = computed(() => {
        const totals: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const m = this.str(this.f(r.data, 'municipio'));
            if (!m) continue;
            totals[m] = (totals[m] || 0) + this.rowTotal(r.data);
        }
        const colors = ['#7B1FA2', '#9333EA', '#A855F7', '#C084FC', '#1565C0', '#2563EB',
                        '#0891B2', '#06B6D4', '#E65100', '#F97316', '#DB2777', '#EC4899'];
        return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 12)
            .map(([label, value], i) => ({ label, value: Math.round(value), color: colors[i % colors.length] }));
    });

    composicionData = computed(() => {
        const k = this.kpis();
        return [
            { label: 'Perros', value: Math.round(k.kgPerro), color: '#1565C0',
              pct: k.kgTotal ? Math.round(k.kgPerro / k.kgTotal * 100) : 0 },
            { label: 'Gatos', value: Math.round(k.kgGato), color: '#DB2777',
              pct: k.kgTotal ? Math.round(k.kgGato / k.kgTotal * 100) : 0 },
        ].filter(s => s.value > 0);
    });

    rankingDonantes = computed(() => {
        const totals: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const n = this.str(this.f(r.data, 'nombre'));
            if (!n) continue;
            totals[n] = (totals[n] || 0) + this.rowTotal(r.data);
        }
        return Object.entries(totals).filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([label, value]) => ({ label, value: Math.round(value) }));
    });

    mesData = computed(() => {
        const totals: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const { mes, anio } = this.parseFecha(r.data['fecha']);
            if (mes == null || anio == null) continue;
            const key = `${anio}-${String(mes).padStart(2, '0')}`;
            totals[key] = (totals[key] || 0) + this.rowTotal(r.data);
        }
        return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                const [y, m] = key.split('-').map(Number);
                return { label: `${MES_CORTO[m - 1]} ${y}`, value: Math.round(value) };
            });
    });

    completitudData = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length || 1;
        const conNombre = recs.filter(r => this.str(this.f(r.data, 'nombre'))).length;
        const conTel = recs.filter(r => this.str(this.f(r.data, 'telefono'))).length;
        const conFecha = recs.filter(r => this.str(r.data['fecha'])).length;
        return [
            { label: 'Con nombre del donante', value: Math.round(conNombre / total * 100),
              pct: Math.round(conNombre / total * 100), color: '#7B1FA2' },
            { label: 'Con teléfono', value: Math.round(conTel / total * 100),
              pct: Math.round(conTel / total * 100), color: '#1565C0' },
            { label: 'Con fecha', value: Math.round(conFecha / total * 100),
              pct: Math.round(conFecha / total * 100), color: '#0891B2' },
        ];
    });

    tablaMunData = computed(() => {
        const stats: Record<string, { donaciones: number; perro: number; gato: number; total: number; donantes: Set<string> }> = {};
        for (const r of this.filteredRecords()) {
            const m = this.str(this.f(r.data, 'municipio'));
            if (!m) continue;
            if (!stats[m]) stats[m] = { donaciones: 0, perro: 0, gato: 0, total: 0, donantes: new Set() };
            stats[m].donaciones += 1;
            stats[m].perro += this.num(this.f(r.data, 'alimento', 'perro'));
            stats[m].gato += this.num(this.f(r.data, 'alimento', 'gato'));
            stats[m].total += this.rowTotal(r.data);
            const n = this.norm(this.f(r.data, 'nombre')); if (n) stats[m].donantes.add(n);
        }
        return Object.entries(stats).sort((a, b) => b[1].total - a[1].total).slice(0, 15)
            .map(([municipio, s]) => ({
                municipio, donaciones: s.donaciones,
                perro: Math.round(s.perro), gato: Math.round(s.gato),
                total: Math.round(s.total), donantes: s.donantes.size,
            }));
    });

    // ─── Directorio donantes ─────────────────────────────────────────
    private buildDonante(r: RecRow): DonanteRow {
        const nombre = this.str(this.f(r.data, 'nombre')) || 'Anónimo';
        const words = nombre.split(/\s+/).filter(Boolean);
        const initials = words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : (words[0]?.[0] || '?').toUpperCase();
        const { mes, anio } = this.parseFecha(r.data['fecha']);
        return {
            id: r.id, nombre, initials,
            municipio: this.str(this.f(r.data, 'municipio')),
            fecha: this.str(r.data['fecha']),
            mes: this.mesLabel(mes, anio),
            perro: this.num(this.f(r.data, 'alimento', 'perro')),
            gato: this.num(this.f(r.data, 'alimento', 'gato')),
            total: Math.round(this.rowTotal(r.data)),
            telefono: this.str(this.f(r.data, 'telefono')),
        };
    }

    allDonantes = computed<DonanteRow[]>(() =>
        this.filteredRecords().map(r => this.buildDonante(r)).sort((a, b) => b.total - a.total));

    searchedDonantes = computed<DonanteRow[]>(() => {
        const q = this.donanteSearch().toLowerCase().trim();
        const all = this.allDonantes();
        if (!q) return all;
        return all.filter(d =>
            d.nombre.toLowerCase().includes(q) ||
            d.municipio.toLowerCase().includes(q) ||
            d.telefono.includes(q));
    });

    paginatedDonantes = computed<DonanteRow[]>(() => {
        const start = (this.donantePage() - 1) * this.donantePageSize;
        return this.searchedDonantes().slice(start, start + this.donantePageSize);
    });

    donanteTotalPages = computed(() =>
        Math.max(1, Math.ceil(this.searchedDonantes().length / this.donantePageSize)));

    toggleDonante(id: number): void {
        this.expandedDonanteId.set(this.expandedDonanteId() === id ? null : id);
    }
    setDonantePage(p: number): void { this.donantePage.set(p); this.expandedDonanteId.set(null); }
    onDonanteSearch(): void { this.donantePage.set(1); this.expandedDonanteId.set(null); }

    applyFilters(): void {
        this.cdr.markForCheck();
        this.scheduleRender();
    }
    clearFilters(): void {
        this.filterMunicipio.set(''); this.filterMes.set(''); this.filterTipo.set('');
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
        this.renderMunicipio(Chart);
        this.renderComposicion(Chart);
        this.renderRanking(Chart);
        this.renderMes(Chart);
    }

    private renderMunicipio(Chart: any): void {
        this.withCanvas('cvDonMun', 0, el => {
            const data = this.municipioData();
            this.charts['cvDonMun'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color),
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} kg` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#666', maxRotation: 45 } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }

    private renderComposicion(Chart: any): void {
        this.withCanvas('cvDonComp', 0, el => {
            const segs = this.composicionData();
            if (!segs.length) return;
            this.charts['cvDonComp'] = new Chart(el, {
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
                                return ` ${ctx.label}: ${ctx.raw.toLocaleString()} kg (${pct}%)`;
                            },
                        } } },
                },
            });
        });
    }

    private renderRanking(Chart: any): void {
        this.withCanvas('cvDonRanking', 0, el => {
            const data = this.rankingDonantes();
            this.charts['cvDonRanking'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: '#7B1FA2',
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} kg` } } },
                    scales: {
                        x: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#333' } },
                    },
                },
            });
        });
    }

    private renderMes(Chart: any): void {
        this.withCanvas('cvDonMes', 0, el => {
            const data = this.mesData();
            this.charts['cvDonMes'] = new Chart(el, {
                type: 'line',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value),
                        borderColor: '#7B1FA2', backgroundColor: 'rgba(123,31,162,0.12)',
                        borderWidth: 2.5, fill: true, tension: 0.35,
                        pointBackgroundColor: '#7B1FA2', pointRadius: 4, pointHoverRadius: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} kg` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#666' } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }
}

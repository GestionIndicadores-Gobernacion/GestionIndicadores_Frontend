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

interface PersonaRow {
    id: number;
    nombre: string;
    initials: string;
    municipio: string;
    fecha: string;
    mes: string;
    documento: string;
    telefono: string;
    correo: string;
    edad: number | null;
    genero: 'Mujer' | 'Hombre' | 'Otro';
    zona: 'Rural' | 'Urbana' | '—';
    guia1: boolean;
    guia2: boolean;
    guia3: boolean;
}

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
    selector: 'app-personas-capacitadas-consolidado-view',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, DashboardCompletenessComponent],
    templateUrl: './view.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonasCapacitadasConsolidadoViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() data!: DashboardData;

    viewerData = signal<ViewerData | null>(null);
    loading = signal(true);

    filterMunicipio = signal('');
    filterAnio = signal('');
    filterMes = signal('');
    filterZona = signal<'' | 'rural' | 'urbana'>('');
    filterGenero = signal<'' | 'mujer' | 'hombre'>('');

    personaPage = signal(1);
    personaSearch = signal('');
    expandedPersonaId = signal<number | null>(null);
    readonly personaPageSize = 15;

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

    ngAfterViewInit(): void {
        this.viewReady = true;
        if (this.pendingRender) {
            this.pendingRender = false;
            this.renderAll();
        }
    }

    ngOnDestroy(): void { this.destroyAll(); }

    private scheduleRender(): void {
        if (!this.viewReady) {
            this.pendingRender = true;
            return;
        }
        requestAnimationFrame(() =>
            requestAnimationFrame(() => this.renderAll())
        );
    }

    private withCanvas(id: string, fn: (el: HTMLCanvasElement) => void): void {
        const el = document.getElementById(id) as HTMLCanvasElement | null;
        if (!el) return;
        const parent = el.parentElement;
        if (!parent || parent.offsetWidth === 0) return;
        fn(el);
        const chart = this.charts[id];
        if (chart && typeof chart.resize === 'function') chart.resize();
    }

    // ─── Helpers ──────────────────────────────────────────────────────
    private str(v: any): string { return v == null ? '' : String(v).trim(); }
    private norm(v: any): string { return this.str(v).toLowerCase(); }
    private num(v: any): number | null {
        if (v == null || v === '') return null;
        const n = Number(v); return isNaN(n) ? null : n;
    }
    private isYes(v: any): boolean {
        return ['si', 'sí', 'yes', '1', 'true', 'x'].includes(this.norm(v));
    }
    /**
     * Las filas de totales del Excel guardan números en celdas que normalmente
     * son "Si"/vacío (mujer, hombre, guia_1, etc). Las descartamos del análisis.
     */
    private isTotalRow(d: Record<string, any>): boolean {
        const flags = ['mujer', 'hombre', 'rural', 'urbana', 'guia_1', 'guia_2', 'guia_3'];
        return flags.some(k => typeof d[k] === 'number');
    }

    private parseFecha(v: any): { mes: number | null; anio: number | null } {
        if (!v) return { mes: null, anio: null };
        const s = String(v).trim();
        // ISO datetime '2026-01-15T00:00:00' o '2026-01-15'
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            return { anio: parseInt(s.slice(0, 4), 10), mes: parseInt(s.slice(5, 7), 10) };
        }
        // Nombre de mes en texto plano: "Enero", "Febrero"…
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const idx = meses.indexOf(s.toLowerCase());
        if (idx >= 0) return { mes: idx + 1, anio: new Date().getFullYear() };
        return { mes: null, anio: null };
    }
    private mesLabel(mes: number | null, anio: number | null): string {
        if (mes == null) return 'Sin fecha';
        return anio ? `${MES_CORTO[mes - 1]} ${anio}` : MES_CORTO[mes - 1];
    }
    private titleCase(s: string): string {
        return s.replace(/\b\w/g, c => c.toUpperCase());
    }
    private cleanMunicipio(v: any): string {
        return this.titleCase(this.str(v).toLowerCase().replace(/\s+/g, ' ').trim());
    }

    // ─── Filtered records ────────────────────────────────────────────
    filteredRecords = computed<RecRow[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const mun = this.norm(this.filterMunicipio());
        const anio = this.filterAnio();
        const mes = this.filterMes();
        const zona = this.filterZona();
        const genero = this.filterGenero();
        return d.records.filter(r => {
            if (this.isTotalRow(r.data)) return false;
            if (mun && this.norm(this.cleanMunicipio(r.data['municipio'])) !== mun) return false;
            const { mes: m, anio: a } = this.parseFecha(r.data['fecha']);
            if (anio && String(a ?? '') !== anio) return false;
            if (mes && this.mesLabel(m, a) !== mes) return false;
            if (zona === 'rural' && !this.isYes(r.data['rural'])) return false;
            if (zona === 'urbana' && !this.isYes(r.data['urbana'])) return false;
            if (genero === 'mujer' && !this.isYes(r.data['mujer'])) return false;
            if (genero === 'hombre' && !this.isYes(r.data['hombre'])) return false;
            return true;
        });
    });

    municipios = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.filter(r => !this.isTotalRow(r.data)).forEach(r => {
            const v = this.cleanMunicipio(r.data['municipio']);
            if (v) set.add(v);
        });
        return Array.from(set).sort();
    });

    aniosDisponibles = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.filter(r => !this.isTotalRow(r.data)).forEach(r => {
            const { anio } = this.parseFecha(r.data['fecha']);
            if (anio != null) set.add(String(anio));
        });
        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    });

    mesesDisponibles = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const anioFilter = this.filterAnio();
        const set = new Set<string>();
        d.records.filter(r => !this.isTotalRow(r.data)).forEach(r => {
            const { mes, anio } = this.parseFecha(r.data['fecha']);
            if (mes == null) return;
            if (anioFilter && String(anio ?? '') !== anioFilter) return;
            set.add(this.mesLabel(mes, anio));
        });
        return Array.from(set).sort((a, b) => {
            const [ma, aa] = a.split(' '); const [mb, ab] = b.split(' ');
            if (aa && ab && aa !== ab) return Number(aa) - Number(ab);
            return MES_CORTO.indexOf(ma) - MES_CORTO.indexOf(mb);
        });
    });

    // ─── KPIs ─────────────────────────────────────────────────────────
    kpis = computed(() => {
        const recs = this.filteredRecords();
        let mujer = 0, hombre = 0, rural = 0, urbana = 0;
        let edadSum = 0, edadCount = 0;
        const munSet = new Set<string>();
        for (const r of recs) {
            if (this.isYes(r.data['mujer'])) mujer++;
            if (this.isYes(r.data['hombre'])) hombre++;
            if (this.isYes(r.data['rural'])) rural++;
            if (this.isYes(r.data['urbana'])) urbana++;
            const e = this.num(r.data['edad']);
            if (e != null && e > 0 && e < 120) { edadSum += e; edadCount++; }
            const m = this.cleanMunicipio(r.data['municipio']);
            if (m) munSet.add(m);
        }
        return {
            total: recs.length, mujer, hombre, rural, urbana,
            municipios: munSet.size,
            edadPromedio: edadCount ? Math.round(edadSum / edadCount) : 0,
        };
    });

    // ─── Charts data ──────────────────────────────────────────────────
    municipioData = computed(() => {
        const totals: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const m = this.cleanMunicipio(r.data['municipio']);
            if (!m) continue;
            totals[m] = (totals[m] || 0) + 1;
        }
        const colors = ['#7B1FA2', '#9333EA', '#A855F7', '#C084FC', '#1565C0', '#2563EB',
                        '#0891B2', '#06B6D4', '#E65100', '#F97316', '#DB2777', '#EC4899'];
        return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 12)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    });

    generoData = computed(() => {
        const k = this.kpis();
        const total = k.mujer + k.hombre || 1;
        return [
            { label: 'Mujeres', value: k.mujer, color: '#DB2777',
              pct: Math.round(k.mujer / total * 100) },
            { label: 'Hombres', value: k.hombre, color: '#1565C0',
              pct: Math.round(k.hombre / total * 100) },
        ].filter(s => s.value > 0);
    });

    zonaData = computed(() => {
        const k = this.kpis();
        const total = k.rural + k.urbana || 1;
        return [
            { label: 'Urbana', value: k.urbana, color: '#7B1FA2',
              pct: Math.round(k.urbana / total * 100) },
            { label: 'Rural', value: k.rural, color: '#10B981',
              pct: Math.round(k.rural / total * 100) },
        ].filter(s => s.value > 0);
    });

    mesData = computed(() => {
        const totals: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const { mes, anio } = this.parseFecha(r.data['fecha']);
            if (mes == null) continue;
            const key = `${anio || 0}-${String(mes).padStart(2, '0')}`;
            totals[key] = (totals[key] || 0) + 1;
        }
        return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                const [y, m] = key.split('-').map(Number);
                return { label: y ? `${MES_CORTO[m - 1]} ${y}` : MES_CORTO[m - 1], value };
            });
    });

    completitudData = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length || 1;
        const conNombre = recs.filter(r => this.str(r.data['nombres_y_apellidos'])).length;
        const conTel = recs.filter(r => this.str(r.data['telefono'])).length;
        const conDoc = recs.filter(r => this.str(r.data['documento'])).length;
        const conEdad = recs.filter(r => this.num(r.data['edad']) != null).length;
        return [
            { label: 'Con nombre', value: Math.round(conNombre / total * 100),
              pct: Math.round(conNombre / total * 100), color: '#7B1FA2' },
            { label: 'Con documento', value: Math.round(conDoc / total * 100),
              pct: Math.round(conDoc / total * 100), color: '#1565C0' },
            { label: 'Con teléfono', value: Math.round(conTel / total * 100),
              pct: Math.round(conTel / total * 100), color: '#0891B2' },
            { label: 'Con edad', value: Math.round(conEdad / total * 100),
              pct: Math.round(conEdad / total * 100), color: '#E65100' },
        ];
    });

    tablaMunData = computed(() => {
        const stats: Record<string, { total: number; mujer: number; hombre: number; rural: number; urbana: number }> = {};
        for (const r of this.filteredRecords()) {
            const m = this.cleanMunicipio(r.data['municipio']);
            if (!m) continue;
            if (!stats[m]) stats[m] = { total: 0, mujer: 0, hombre: 0, rural: 0, urbana: 0 };
            stats[m].total += 1;
            if (this.isYes(r.data['mujer']))  stats[m].mujer += 1;
            if (this.isYes(r.data['hombre'])) stats[m].hombre += 1;
            if (this.isYes(r.data['rural']))  stats[m].rural += 1;
            if (this.isYes(r.data['urbana'])) stats[m].urbana += 1;
        }
        return Object.entries(stats).sort((a, b) => b[1].total - a[1].total).slice(0, 15)
            .map(([municipio, s]) => ({ municipio, ...s }));
    });

    // ─── Directorio personas ─────────────────────────────────────────
    private buildPersona(r: RecRow): PersonaRow {
        const nombre = this.titleCase(this.str(r.data['nombres_y_apellidos']).toLowerCase()) || 'Anónimo';
        const words = nombre.split(/\s+/).filter(Boolean);
        const initials = words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : (words[0]?.[0] || '?').toUpperCase();
        const { mes, anio } = this.parseFecha(r.data['fecha']);
        const genero: PersonaRow['genero'] =
            this.isYes(r.data['mujer']) ? 'Mujer' :
            this.isYes(r.data['hombre']) ? 'Hombre' : 'Otro';
        const zona: PersonaRow['zona'] =
            this.isYes(r.data['rural']) ? 'Rural' :
            this.isYes(r.data['urbana']) ? 'Urbana' : '—';
        return {
            id: r.id, nombre, initials,
            municipio: this.cleanMunicipio(r.data['municipio']),
            fecha: this.str(r.data['fecha']),
            mes: this.mesLabel(mes, anio),
            documento: this.str(r.data['documento']),
            telefono: this.str(r.data['telefono']),
            correo: this.str(r.data['correo_electronico']),
            edad: this.num(r.data['edad']),
            genero, zona,
            guia1: this.isYes(r.data['guia_1']),
            guia2: this.isYes(r.data['guia_2']),
            guia3: this.isYes(r.data['guia_3']),
        };
    }

    allPersonas = computed<PersonaRow[]>(() =>
        this.filteredRecords().map(r => this.buildPersona(r)));

    searchedPersonas = computed<PersonaRow[]>(() => {
        const q = this.personaSearch().toLowerCase().trim();
        const all = this.allPersonas();
        if (!q) return all;
        return all.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.municipio.toLowerCase().includes(q) ||
            p.documento.includes(q) ||
            p.telefono.includes(q));
    });

    paginatedPersonas = computed<PersonaRow[]>(() => {
        const start = (this.personaPage() - 1) * this.personaPageSize;
        return this.searchedPersonas().slice(start, start + this.personaPageSize);
    });

    personaTotalPages = computed(() =>
        Math.max(1, Math.ceil(this.searchedPersonas().length / this.personaPageSize)));

    togglePersona(id: number): void {
        this.expandedPersonaId.set(this.expandedPersonaId() === id ? null : id);
    }
    setPersonaPage(p: number): void { this.personaPage.set(p); this.expandedPersonaId.set(null); }
    onPersonaSearch(): void { this.personaPage.set(1); this.expandedPersonaId.set(null); }

    applyFilters(): void {
        this.personaPage.set(1);
        this.cdr.markForCheck();
        this.scheduleRender();
    }
    clearFilters(): void {
        this.filterMunicipio.set(''); this.filterAnio.set(''); this.filterMes.set('');
        this.filterZona.set(''); this.filterGenero.set('');
        this.personaPage.set(1);
        this.cdr.markForCheck();
        this.scheduleRender();
    }

    onAnioChange(v: string): void {
        this.filterAnio.set(v);
        // Si el mes seleccionado ya no pertenece al año actual, lo limpiamos.
        const mes = this.filterMes();
        if (mes && !this.mesesDisponibles().includes(mes)) {
            this.filterMes.set('');
        }
        this.applyFilters();
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
        this.renderGenero(Chart);
        this.renderZona(Chart);
        this.renderMes(Chart);
    }

    private renderMunicipio(Chart: any): void {
        this.withCanvas('cvPcMun', el => {
            const data = this.municipioData();
            this.charts['cvPcMun'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color),
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} personas` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#666', maxRotation: 45 } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }

    private renderGenero(Chart: any): void {
        this.withCanvas('cvPcGenero', el => {
            const segs = this.generoData();
            if (!segs.length) return;
            this.charts['cvPcGenero'] = new Chart(el, {
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

    private renderZona(Chart: any): void {
        this.withCanvas('cvPcZona', el => {
            const segs = this.zonaData();
            if (!segs.length) return;
            this.charts['cvPcZona'] = new Chart(el, {
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

    private renderMes(Chart: any): void {
        this.withCanvas('cvPcMes', el => {
            const data = this.mesData();
            this.charts['cvPcMes'] = new Chart(el, {
                type: 'line',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value),
                        borderColor: '#7B1FA2', backgroundColor: 'rgba(123,31,162,0.12)',
                        borderWidth: 2.5, fill: true, tension: 0.35,
                        pointBackgroundColor: '#7B1FA2', pointRadius: 4, pointHoverRadius: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw.toLocaleString()} personas` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#666' } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }
}

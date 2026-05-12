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

interface DenunciaRow {
    id: number;
    caso: string;
    fecha: string;
    fechaCorta: string;
    mes: string;
    denunciante: string;
    initials: string;
    municipio: string;
    especie: string;
    motivo: string;
    motivoColor: string;
    anonima: boolean;
    correo: string;
    celular: string;
    whatsapp: string;
    otroTel: string;
    adjuntos: string;
    hechos: string;
    peticion: string;
    cuidador: string;
    horario: string;
    zona: string;
    barrio: string;
    direccion: string;
    gestion1: string;
    gestion2: string;
    documento: string;
    tipoDoc: string;
}

const MES_KW: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9,
    octubre: 10, noviembre: 11, diciembre: 12,
};
const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const MOTIVOS = [
    { label: 'Maltrato animal',         key: 'maltrato',     color: '#DC2626' },
    { label: 'Problema de convivencia', key: 'convivencia',  color: '#D97706' },
    { label: 'Mala tenencia',           key: 'mala tenencia',color: '#7C3AED' },
    { label: 'Abandono',                key: 'abandono',     color: '#0891B2' },
];

@Component({
    selector: 'app-denuncias-view',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, DashboardCompletenessComponent],
    templateUrl: './view.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenunciasViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() data!: DashboardData;

    viewerData = signal<ViewerData | null>(null);
    loading = signal(true);

    filterMunicipio = signal('');
    filterMotivo = signal('');
    filterEspecie = signal('');
    filterAnio = signal('');
    filterMes = signal('');
    filterAnonima = signal(''); // '', 'si', 'no'

    casoPage = signal(1);
    casoSearch = signal('');
    expandedCasoId = signal<number | null>(null);
    readonly casoPageSize = 12;

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
        if (!this.viewReady) { this.pendingRender = true; return; }
        requestAnimationFrame(() =>
            requestAnimationFrame(() => this.renderAll())
        );
    }

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
            if (keywords.every(kw => k.includes(kw))) {
                const v = row[key];
                if (v !== null && v !== undefined && String(v).trim() !== '') return v;
            }
        }
        return null;
    }
    private fForbid(row: Record<string, any>, must: string[], forbid: string[]): any {
        for (const key of Object.keys(row)) {
            const k = key.toLowerCase();
            if (forbid.some(fb => k.includes(fb))) continue;
            if (must.every(kw => k.includes(kw))) {
                const v = row[key];
                if (v !== null && v !== undefined && String(v).trim() !== '') return v;
            }
        }
        return null;
    }
    private str(v: any): string { return v == null ? '' : String(v).trim(); }
    private norm(v: any): string {
        return this.str(v).toLowerCase()
            .normalize('NFKD').replace(/[̀-ͯ]/g, '');
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
    private fechaCorta(v: any): string {
        const s = this.str(v);
        if (!s) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        return s.length > 22 ? s.slice(0, 22) + '…' : s;
    }
    private classifyMotivo(v: any): { label: string; color: string } {
        const n = this.norm(v);
        if (!n) return { label: 'Sin clasificar', color: '#94A3B8' };
        for (const m of MOTIVOS) if (n.includes(m.key)) return { label: m.label, color: m.color };
        return { label: 'Sin clasificar', color: '#94A3B8' };
    }
    private isAnonima(v: any): boolean {
        const n = this.norm(v);
        return n === 'si' || n === 'sí' || n === 'yes' || n === 'true' || n === '1' || n.includes('anonim');
    }
    private getMunicipio(d: Record<string, any>): string {
        return this.str(this.f(d, 'municipio') || this.f(d, 'donde', 'maltrato'));
    }
    private getFecha(d: Record<string, any>): string {
        // Preferir "fecha" general, evitar "presunto" o "diligenciamiento"
        return this.str(this.fForbid(d, ['fecha'], ['presunto', 'diligenciamiento']) || d['fecha'] || '');
    }
    private getMotivo(d: Record<string, any>): any { return this.f(d, 'motivo'); }
    private getEspecie(d: Record<string, any>): string { return this.str(this.f(d, 'especie')); }
    private getAnonima(d: Record<string, any>): any {
        return this.f(d, 'anonima') || this.f(d, 'anonim');
    }

    // ─── Filtered records ────────────────────────────────────────────
    filteredRecords = computed<RecRow[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const mun = this.filterMunicipio().toLowerCase();
        const mot = this.filterMotivo();
        const esp = this.filterEspecie().toLowerCase();
        const anio = this.filterAnio();
        const mes = this.filterMes();
        const anon = this.filterAnonima();
        return d.records.filter(r => {
            if (mun && this.norm(this.getMunicipio(r.data)) !== this.norm(mun)) return false;
            if (mot && this.classifyMotivo(this.getMotivo(r.data)).label !== mot) return false;
            if (esp && this.norm(this.getEspecie(r.data)) !== this.norm(esp)) return false;
            if (anio) {
                const { anio: a } = this.parseFecha(this.getFecha(r.data));
                if (a == null || String(a) !== anio) return false;
            }
            if (mes) {
                const { mes: m, anio: a } = this.parseFecha(this.getFecha(r.data));
                if (this.mesLabel(m, a) !== mes) return false;
            }
            if (anon) {
                const isA = this.isAnonima(this.getAnonima(r.data));
                if (anon === 'si' && !isA) return false;
                if (anon === 'no' && isA) return false;
            }
            return true;
        });
    });

    municipios = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => { const v = this.getMunicipio(r.data); if (v) set.add(v); });
        return Array.from(set).sort();
    });

    especies = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => { const v = this.getEspecie(r.data); if (v) set.add(v); });
        return Array.from(set).sort();
    });

    motivosDisponibles = computed<string[]>(() => MOTIVOS.map(m => m.label));

    aniosDisponibles = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => {
            const { anio } = this.parseFecha(this.getFecha(r.data));
            if (anio != null) set.add(String(anio));
        });
        return Array.from(set).sort((a, b) => Number(b) - Number(a));
    });

    mesesDisponibles = computed<string[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const anioSel = this.filterAnio();
        const set = new Set<string>();
        d.records.forEach(r => {
            const { mes, anio } = this.parseFecha(this.getFecha(r.data));
            if (mes == null || anio == null) return;
            if (anioSel && String(anio) !== anioSel) return;
            set.add(this.mesLabel(mes, anio));
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
        const total = recs.length;
        let anonimas = 0, conSeguimiento = 0, conEvidencia = 0, conCorreo = 0, conTel = 0;
        const munSet = new Set<string>();
        for (const r of recs) {
            if (this.isAnonima(this.getAnonima(r.data))) anonimas++;
            const g1 = this.str(this.f(r.data, 'gestion', '1') || this.f(r.data, 'seguimiento', '1'));
            const g2 = this.str(this.f(r.data, 'gestion', '2') || this.f(r.data, 'seguimiento', '2'));
            if (g1 || g2) conSeguimiento++;
            if (this.str(this.f(r.data, 'adjunta') || this.f(r.data, 'fotos') || this.f(r.data, 'videos'))) conEvidencia++;
            if (this.str(this.f(r.data, 'correo') || this.f(r.data, 'email'))) conCorreo++;
            const tel = this.str(this.f(r.data, 'celular') || this.f(r.data, 'whatsapp') || this.fForbid(r.data, ['otro'], []));
            if (tel) conTel++;
            const m = this.norm(this.getMunicipio(r.data)); if (m) munSet.add(m);
        }
        const pct = (x: number) => total ? Math.round(x / total * 100) : 0;
        return {
            total, anonimas, conSeguimiento, conEvidencia, conCorreo, conTel,
            municipios: munSet.size,
            pctAnonimas: pct(anonimas),
            pctSeguimiento: pct(conSeguimiento),
            pctEvidencia: pct(conEvidencia),
            pctContactables: pct(Math.max(conTel, conCorreo)),
        };
    });

    // ─── Chart data ──────────────────────────────────────────────────
    motivoData = computed(() => {
        const counts: Record<string, number> = {};
        let sinClasif = 0;
        for (const r of this.filteredRecords()) {
            const c = this.classifyMotivo(this.getMotivo(r.data));
            if (c.label === 'Sin clasificar') sinClasif++;
            else counts[c.label] = (counts[c.label] || 0) + 1;
        }
        const segs = MOTIVOS
            .filter(m => counts[m.label])
            .map(m => ({ label: m.label, value: counts[m.label], color: m.color }));
        if (sinClasif > 0) segs.push({ label: 'Sin clasificar', value: sinClasif, color: '#E2E8F0' });
        const t = segs.reduce((a, b) => a + b.value, 0) || 1;
        return segs.map(s => ({ ...s, pct: Math.round(s.value / t * 100) }));
    });

    especieData = computed(() => {
        const counts: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const e = this.getEspecie(r.data);
            if (!e) continue;
            counts[e] = (counts[e] || 0) + 1;
        }
        const colors = ['#DC2626', '#D97706', '#7C3AED', '#0891B2', '#059669', '#2563EB',
                        '#DB2777', '#0D9488', '#9333EA', '#E65100'];
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    });

    municipioData = computed(() => {
        const counts: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const m = this.getMunicipio(r.data);
            if (!m) continue;
            counts[m] = (counts[m] || 0) + 1;
        }
        const colors = ['#DC2626', '#E65100', '#D97706', '#9333EA', '#7C3AED', '#2563EB',
                        '#0891B2', '#059669', '#DB2777', '#0D9488', '#F97316', '#EC4899'];
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    });

    mesData = computed(() => {
        const counts: Record<string, number> = {};
        for (const r of this.filteredRecords()) {
            const { mes, anio } = this.parseFecha(this.getFecha(r.data));
            if (mes == null || anio == null) continue;
            const key = `${anio}-${String(mes).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        }
        return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                const [y, m] = key.split('-').map(Number);
                return { label: `${MES_CORTO[m - 1]} ${y}`, value };
            });
    });

    anonimatoData = computed(() => {
        const k = this.kpis();
        const ident = k.total - k.anonimas;
        return [
            { label: 'Anónima', value: k.anonimas, color: '#64748B',
              pct: k.total ? Math.round(k.anonimas / k.total * 100) : 0 },
            { label: 'Identificada', value: ident, color: '#2563EB',
              pct: k.total ? Math.round(ident / k.total * 100) : 0 },
        ].filter(s => s.value > 0);
    });

    completitudData = computed(() => {
        const k = this.kpis();
        const t = k.total || 1;
        return [
            { label: 'Con correo del denunciante', value: Math.round(k.conCorreo / t * 100),
              pct: Math.round(k.conCorreo / t * 100), color: '#2563EB' },
            { label: 'Con teléfono o WhatsApp', value: Math.round(k.conTel / t * 100),
              pct: Math.round(k.conTel / t * 100), color: '#0891B2' },
            { label: 'Con adjuntos (fotos/videos)', value: Math.round(k.conEvidencia / t * 100),
              pct: Math.round(k.conEvidencia / t * 100), color: '#059669' },
            { label: 'Con seguimiento (gestión 1 ó 2)', value: Math.round(k.conSeguimiento / t * 100),
              pct: Math.round(k.conSeguimiento / t * 100), color: '#7C3AED' },
        ];
    });

    // ─── Directorio de denuncias ─────────────────────────────────────
    private buildDenuncia(r: RecRow): DenunciaRow {
        const d = r.data;
        const denunciante = this.str(this.f(d, 'denunciante')) || (this.isAnonima(this.getAnonima(d)) ? 'Anónimo' : '—');
        const words = denunciante.split(/\s+/).filter(Boolean);
        const initials = words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : (words[0]?.[0] || '?').toUpperCase();
        const fechaRaw = this.getFecha(d);
        const { mes, anio } = this.parseFecha(fechaRaw);
        const mot = this.classifyMotivo(this.getMotivo(d));
        return {
            id: r.id,
            caso: this.str(this.f(d, 'numero', 'caso')) || `#${r.id}`,
            fecha: fechaRaw,
            fechaCorta: this.fechaCorta(fechaRaw),
            mes: this.mesLabel(mes, anio),
            denunciante,
            initials,
            municipio: this.getMunicipio(d),
            especie: this.getEspecie(d),
            motivo: mot.label,
            motivoColor: mot.color,
            anonima: this.isAnonima(this.getAnonima(d)),
            correo: this.str(this.f(d, 'correo') || this.f(d, 'email')),
            celular: this.str(this.f(d, 'celular')),
            whatsapp: this.str(this.f(d, 'whatsapp')),
            otroTel: this.str(this.fForbid(d, ['otro'], ['nombre', 'numero_de_caso'])),
            adjuntos: this.str(this.f(d, 'adjunta') || this.f(d, 'fotos') || this.f(d, 'videos')),
            hechos: this.str(this.f(d, 'hechos')),
            peticion: this.str(this.f(d, 'peticion')),
            cuidador: this.str(this.f(d, 'cuidador')),
            horario: this.str(this.f(d, 'horario')),
            zona: this.str(this.f(d, 'zona')),
            barrio: this.str(this.f(d, 'barrio') || this.f(d, 'vereda') || this.f(d, 'corregimiento')),
            direccion: this.str(this.f(d, 'direccion')),
            gestion1: this.str(this.f(d, 'gestion', '1') || this.f(d, 'seguimiento', '1')),
            gestion2: this.str(this.f(d, 'gestion', '2') || this.f(d, 'seguimiento', '2')),
            documento: this.str(this.f(d, 'numero', 'documento')),
            tipoDoc: this.str(this.f(d, 'tipo', 'documento')),
        };
    }

    allDenuncias = computed<DenunciaRow[]>(() =>
        this.filteredRecords().map(r => this.buildDenuncia(r))
            .sort((a, b) => b.fecha.localeCompare(a.fecha)));

    searchedDenuncias = computed<DenunciaRow[]>(() => {
        const q = this.casoSearch().toLowerCase().trim();
        const all = this.allDenuncias();
        if (!q) return all;
        return all.filter(d =>
            d.caso.toLowerCase().includes(q) ||
            d.denunciante.toLowerCase().includes(q) ||
            d.municipio.toLowerCase().includes(q) ||
            d.documento.includes(q));
    });

    paginatedDenuncias = computed<DenunciaRow[]>(() => {
        const start = (this.casoPage() - 1) * this.casoPageSize;
        return this.searchedDenuncias().slice(start, start + this.casoPageSize);
    });

    casoTotalPages = computed(() =>
        Math.max(1, Math.ceil(this.searchedDenuncias().length / this.casoPageSize)));

    toggleCaso(id: number): void {
        this.expandedCasoId.set(this.expandedCasoId() === id ? null : id);
    }
    setCasoPage(p: number): void { this.casoPage.set(p); this.expandedCasoId.set(null); }
    onCasoSearch(): void { this.casoPage.set(1); this.expandedCasoId.set(null); }

    applyFilters(): void {
        this.casoPage.set(1);
        this.expandedCasoId.set(null);
        this.cdr.markForCheck();
        this.scheduleRender();
    }
    clearFilters(): void {
        this.filterMunicipio.set('');
        this.filterMotivo.set('');
        this.filterEspecie.set('');
        this.filterAnio.set('');
        this.filterMes.set('');
        this.filterAnonima.set('');
        this.applyFilters();
    }
    onAnioChange(v: string): void {
        this.filterAnio.set(v);
        // Si el mes seleccionado pertenece a otro año, lo limpio para evitar incoherencia.
        const mes = this.filterMes();
        if (mes && v && !mes.endsWith(v)) this.filterMes.set('');
        this.applyFilters();
    }

    isUrl(v: string): boolean { return /^https?:\/\//.test(v); }

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
        this.renderMotivo(Chart);
        this.renderEspecie(Chart);
        this.renderMunicipio(Chart);
        this.renderMes(Chart);
        this.renderAnonimato(Chart);
    }

    private renderMotivo(Chart: any): void {
        this.withCanvas('cvDenMotivo', 0, el => {
            const segs = this.motivoData();
            if (!segs.length) return;
            this.charts['cvDenMotivo'] = new Chart(el, {
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
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            },
                        } } },
                },
            });
        });
    }

    private renderEspecie(Chart: any): void {
        this.withCanvas('cvDenEspecie', 0, el => {
            const data = this.especieData();
            if (!data.length) return;
            this.charts['cvDenEspecie'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color),
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} denuncias` } } },
                    scales: {
                        x: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#333' } },
                    },
                },
            });
        });
    }

    private renderMunicipio(Chart: any): void {
        this.withCanvas('cvDenMun', 0, el => {
            const data = this.municipioData();
            if (!data.length) return;
            this.charts['cvDenMun'] = new Chart(el, {
                type: 'bar',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color),
                                 borderRadius: 4, borderSkipped: false }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} denuncias` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#666', maxRotation: 45 } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    },
                },
            });
        });
    }

    private renderMes(Chart: any): void {
        this.withCanvas('cvDenMes', 0, el => {
            const data = this.mesData();
            if (!data.length) return;
            this.charts['cvDenMes'] = new Chart(el, {
                type: 'line',
                data: { labels: data.map(d => d.label),
                    datasets: [{ data: data.map(d => d.value),
                        borderColor: '#DC2626', backgroundColor: 'rgba(220,38,38,0.12)',
                        borderWidth: 2.5, fill: true, tension: 0.35,
                        pointBackgroundColor: '#DC2626', pointRadius: 4, pointHoverRadius: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false },
                        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} denuncias` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#666' } },
                        y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' }, beginAtZero: true },
                    },
                },
            });
        });
    }

    private renderAnonimato(Chart: any): void {
        this.withCanvas('cvDenAnon', 0, el => {
            const segs = this.anonimatoData();
            if (!segs.length) return;
            this.charts['cvDenAnon'] = new Chart(el, {
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
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            },
                        } } },
                },
            });
        });
    }
}

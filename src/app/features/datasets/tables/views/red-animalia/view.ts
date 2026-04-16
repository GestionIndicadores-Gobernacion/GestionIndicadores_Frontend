import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ViewerData, DatasetService } from '../../../../../features/datasets/services/datasets.service';
import { DashboardData } from '../../table-viewer/table-viewer';
import { DashboardCompletenessComponent } from '../../visualizations/dashboard-completeness/dashboard-completeness';

interface RecRow { id: number; data: Record<string, any>; }

interface MemberRow {
    id: number;
    nombre: string;
    initials: string;
    municipio: string;
    vinculacion: string;
    vinculacionColor: string;
    sexo: string;
    edad: number;
    escolaridad: string;
    discapacidad: string;
    saludMental: string;
    telefono: string;
    otroTelefono: string;
    email: string;
    direccion: string;
    barrio: string;
    organizacion: string;
    perros: number;
    gatos: number;
    caballos: number;
    otros: string;
    capacidad: number;
    area: string;
    necesidad: string;
    visitaGob: string;
    adopcion: string;
    emprendimiento: string;
    tipoEmprendimiento: string;
    fuenteIngreso: string;
    donaciones: string;
    victimaViolencia: string;
    rescates: string;
    apoyoActividades: string;
    antecedentes: string;
    capacitaciones: number;
    jornadas: number;
    totalAnimales: number;
}

@Component({
    selector: 'app-red-animalia-view',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, DashboardCompletenessComponent],
    templateUrl: './view.html',
})
export class RedAnimaliaViewComponent implements OnInit, OnDestroy {
    @Input() data!: DashboardData;

    viewerData = signal<ViewerData | null>(null);
    loading = signal(true);

    filterMunicipio = signal('');
    filterVinculacion = signal('');
    filterSexo = signal('');
    filterEdadMin = signal<number | null>(null);
    filterEdadMax = signal<number | null>(null);

    // Members panel
    memberSearch = signal('');
    memberPage = signal(1);
    expandedMemberId = signal<number | null>(null);
    readonly memberPageSize = 15;

    private charts: Record<string, any> = {};
    private ChartJS: any = null;

    constructor(private ds: DatasetService) {}

    ngOnInit(): void {
        this.ds.getTableViewer(this.data.table.id).subscribe({
            next: d => {
                this.viewerData.set(d);
                this.loading.set(false);
                setTimeout(() => this.renderAll(), 200);
            },
            error: () => this.loading.set(false),
        });
    }

    ngOnDestroy(): void { this.destroyAll(); }

    // ─── Field helpers ──────────────────────────────────────────────

    private f(row: Record<string, any>, ...keywords: string[]): any {
        for (const key of Object.keys(row)) {
            const k = key.toLowerCase();
            if (keywords.every(kw => k.includes(kw))) return row[key];
        }
        return null;
    }

    private num(val: any): number {
        if (val == null) return 0;
        const n = Number(val);
        return isNaN(n) ? 0 : n;
    }

    private str(val: any): string {
        return val == null ? '' : String(val).trim();
    }

    private norm(val: any): string {
        return this.str(val).toLowerCase();
    }

    /** Clasifica el texto libre de vinculacion en categorias conocidas. */
    private normalizeVinculacion(raw: string): string {
        const lower = raw.toLowerCase();
        if (lower.includes('rescatist')) return 'Rescatistas';
        if (lower.includes('fundacion') || lower.includes('fundación') || lower.includes('legalmente')) return 'Fundacion';
        if (lower.includes('albergue') || lower.includes('refugio')) return 'Albergue / Refugio';
        if (lower.includes('hogar de paso')) return 'Hogar de Paso';
        if (lower.includes('voluntari')) return 'Voluntario/a';
        if (lower.includes('cuidador')) return 'Cuidador/a';
        if (!raw || raw.length < 3) return '';
        return 'Otro';
    }

    /** Normaliza keywords de necesidades para agrupar similares. */
    private normalizeNecesidad(raw: string): string {
        const lower = raw.toLowerCase().trim();
        if (lower.includes('aliment')) return 'Alimentacion';
        if (lower.includes('infraestructura')) return 'Infraestructura';
        if (lower.includes('esteriliz')) return 'Esterilizaciones';
        if (lower.includes('medicament') || lower.includes('medico') || lower.includes('médic')) return 'Medicamentos';
        if (lower.includes('veterinari')) return 'Veterinarios';
        if (lower.includes('dotacion') || lower.includes('dotación')) return 'Dotacion';
        if (lower.includes('transport')) return 'Transporte';
        if (lower.includes('voluntari')) return 'Voluntarios';
        if (lower.includes('econom') || lower.includes('financ') || lower.includes('recurso')) return 'Recursos Economicos';
        if (lower.includes('capacit') || lower.includes('formacion')) return 'Capacitacion';
        if (lower.includes('adopcion') || lower.includes('adopción')) return 'Adopciones';
        if (lower.includes('espacio') || lower.includes('terreno') || lower.includes('area') || lower.includes('área')) return 'Espacio Fisico';
        // Return cleaned original for short labels, skip noise
        const clean = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        return clean.length > 35 ? '' : clean;
    }

    // ─── Filtered records ──────────────────────────────────────────

    filteredRecords = computed<RecRow[]>(() => {
        const d = this.viewerData();
        if (!d) return [];
        const mun = this.filterMunicipio().toLowerCase();
        const vin = this.filterVinculacion().toLowerCase();
        const sex = this.filterSexo().toLowerCase();
        const eMin = this.filterEdadMin();
        const eMax = this.filterEdadMax();

        return d.records.filter(r => {
            if (mun && this.norm(this.f(r.data, 'municipio')) !== mun) return false;
            if (vin) {
                const rawVin = this.str(this.f(r.data, 'vinculacion'));
                if (this.normalizeVinculacion(rawVin).toLowerCase() !== vin) return false;
            }
            if (sex && this.norm(this.f(r.data, 'sexo')) !== sex) return false;
            const edad = this.num(this.f(r.data, 'edad'));
            if (eMin != null && edad < eMin) return false;
            if (eMax != null && edad > eMax) return false;
            return true;
        });
    });

    // ─── Dropdown options ──────────────────────────────────────────

    municipios = computed(() => this.uniqueVals('municipio'));
    sexos = computed(() => this.uniqueVals('sexo'));

    /** Dropdown de vinculacion usa categorias normalizadas. */
    vinculacionesNorm = computed((): string[] => {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => {
            const cat = this.normalizeVinculacion(this.str(this.f(r.data, 'vinculacion')));
            if (cat) set.add(cat);
        });
        return Array.from(set).sort();
    });

    private uniqueVals(...keywords: string[]): string[] {
        const d = this.viewerData();
        if (!d) return [];
        const set = new Set<string>();
        d.records.forEach(r => {
            const v = this.str(this.f(r.data, ...keywords));
            if (v) set.add(v);
        });
        return Array.from(set).sort();
    }

    // ─── KPIs ──────────────────────────────────────────────────────

    kpis = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length;
        const munSet = new Set<string>();
        let perros = 0, gatos = 0, caballos = 0, otros = 0, capacidad = 0;

        recs.forEach(r => {
            const m = this.str(this.f(r.data, 'municipio'));
            if (m) munSet.add(m.toLowerCase());
            perros += this.num(this.f(r.data, 'perros'));
            gatos += this.num(this.f(r.data, 'gatos'));
            caballos += this.num(this.f(r.data, 'caballos'));
            const ot = this.f(r.data, 'otros');
            if (ot != null && !isNaN(Number(ot))) otros += Number(ot);
            capacidad += this.num(this.f(r.data, 'capacidad'));
        });

        return {
            total, municipios: munSet.size,
            totalAnimales: perros + gatos + caballos + otros,
            capacidad, caballos, perros, gatos, otros,
        };
    });

    // ─── Sexo donut ────────────────────────────────────────────────

    sexoData = computed(() => {
        const recs = this.filteredRecords();
        const counts: Record<string, number> = {};
        recs.forEach(r => {
            const s = this.str(this.f(r.data, 'sexo'));
            if (s) counts[s] = (counts[s] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value], i) => ({
                label, value,
                pct: recs.length ? Math.round(value / recs.length * 100) : 0,
                color: ['#2E7D32', '#F9A825', '#1565C0', '#7B1FA2'][i % 4],
            }));
    });

    // ─── Edad histogram ────────────────────────────────────────────

    edadData = computed(() => {
        const bins: Record<string, number> = {
            '18-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '60+': 0,
        };
        this.filteredRecords().forEach(r => {
            const e = this.num(this.f(r.data, 'edad'));
            if (e <= 0) return;
            if (e <= 25) bins['18-25']++;
            else if (e <= 35) bins['26-35']++;
            else if (e <= 45) bins['36-45']++;
            else if (e <= 60) bins['46-60']++;
            else bins['60+']++;
        });
        return Object.entries(bins).map(([label, value]) => ({ label, value }));
    });

    // ─── Tipo vinculacion (normalizado) ────────────────────────────

    vinculacionData = computed(() => {
        const counts: Record<string, number> = {};
        this.filteredRecords().forEach(r => {
            const cat = this.normalizeVinculacion(this.str(this.f(r.data, 'vinculacion')));
            if (cat) counts[cat] = (counts[cat] || 0) + 1;
        });
        const colors: Record<string, string> = {
            'Rescatistas': '#2E7D32', 'Fundacion': '#1565C0', 'Albergue / Refugio': '#E65100',
            'Hogar de Paso': '#F9A825', 'Voluntario/a': '#7B1FA2', 'Cuidador/a': '#0891B2', 'Otro': '#94A3B8',
        };
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({
                label, value, color: colors[label] || '#64748B',
                pct: this.filteredRecords().length ? Math.round(value / this.filteredRecords().length * 100) : 0,
            }));
    });

    // ─── Discapacidad donut ────────────────────────────────────────

    discapacidadData = computed(() => {
        let si = 0, no = 0;
        this.filteredRecords().forEach(r => {
            const v = this.norm(this.f(r.data, 'discapacidad'));
            if (v === 'ninguna' || v === 'no' || v === 'no tiene') no++;
            else if (v) si++;
        });
        return [
            { label: 'No', value: no, color: '#2E7D32' },
            { label: 'Si', value: si, color: '#F9A825' },
        ].filter(s => s.value > 0);
    });

    // ─── Animales por tipo ─────────────────────────────────────────

    animalesData = computed(() => {
        const k = this.kpis();
        return [
            { label: 'Perros', value: k.perros, color: '#2E7D32' },
            { label: 'Gatos', value: k.gatos, color: '#1565C0' },
            { label: 'Caballos', value: k.caballos, color: '#F9A825' },
            { label: 'Otros', value: k.otros, color: '#7B1FA2' },
        ].filter(a => a.value > 0);
    });

    // ─── Ranking organizaciones ────────────────────────────────────

    rankingData = computed(() => {
        const orgs: Record<string, number> = {};
        this.filteredRecords().forEach(r => {
            const name = this.str(this.f(r.data, 'nombre'));
            if (!name) return;
            const animals = this.num(this.f(r.data, 'perros')) +
                this.num(this.f(r.data, 'gatos')) +
                this.num(this.f(r.data, 'caballos'));
            orgs[name] = (orgs[name] || 0) + animals;
        });
        return Object.entries(orgs)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([label, value]) => ({ label, value }));
    });

    // ─── Capacidad albergue ────────────────────────────────────────

    capacidadData = computed(() => {
        const recs = this.filteredRecords();
        let capacidad = 0, animalesActuales = 0;
        recs.forEach(r => {
            capacidad += this.num(this.f(r.data, 'capacidad'));
            animalesActuales += this.num(this.f(r.data, 'perros')) +
                this.num(this.f(r.data, 'gatos')) +
                this.num(this.f(r.data, 'caballos'));
        });
        const disponibilidad = Math.max(0, capacidad - animalesActuales);
        return { capacidad, animalesActuales, disponibilidad };
    });

    // ─── Participacion programas ───────────────────────────────────

    programasData = computed(() => {
        const recs = this.filteredRecords();
        const total = recs.length || 1;
        let capRAV = 0, jornadas = 0;
        recs.forEach(r => {
            if (this.num(this.f(r.data, 'capacitaciones')) > 0) capRAV++;
            if (this.num(this.f(r.data, 'jornadas')) > 0) jornadas++;
        });
        return [
            { label: 'Capacitaciones RAV', value: Math.round(capRAV / total * 100), pct: Math.round(capRAV / total * 100), color: '#2E7D32' },
            { label: 'Jornadas de Salud', value: Math.round(jornadas / total * 100), pct: Math.round(jornadas / total * 100), color: '#1565C0' },
        ];
    });

    // ─── Necesidades principales (normalizado + bar ranking) ───────

    necesidadesData = computed(() => {
        const counts: Record<string, number> = {};
        this.filteredRecords().forEach(r => {
            const raw = this.str(this.f(r.data, 'necesidad'));
            if (!raw) return;
            raw.split(/[,;\/]+/).forEach(part => {
                const normalized = this.normalizeNecesidad(part.trim());
                if (normalized && normalized.length > 2) {
                    counts[normalized] = (counts[normalized] || 0) + 1;
                }
            });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const max = sorted[0]?.[1] || 1;
        const colors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A',
                         '#1565C0', '#F9A825', '#E65100', '#7B1FA2', '#94A3B8'];
        return sorted.map(([label, value], i) => ({
            label, value, pct: Math.round(value / max * 100), color: colors[i % colors.length],
        }));
    });

    // ─── Tabla organizaciones ──────────────────────────────────────

    tablaOrgsData = computed(() => {
        const orgs: Record<string, {
            municipio: string; tipo: string; perros: number; gatos: number;
            capacidad: number; rescate: string; adopcion: string;
        }> = {};

        this.filteredRecords().forEach(r => {
            const name = this.str(this.f(r.data, 'nombre'));
            if (!name) return;
            if (!orgs[name]) {
                orgs[name] = {
                    municipio: this.str(this.f(r.data, 'municipio')),
                    tipo: this.normalizeVinculacion(this.str(this.f(r.data, 'vinculacion'))),
                    perros: 0, gatos: 0, capacidad: 0,
                    rescate: this.str(this.f(r.data, 'capacidad_operativa', 'rescate')) || this.str(this.f(r.data, 'rescate')),
                    adopcion: this.str(this.f(r.data, 'adopcion')),
                };
            }
            orgs[name].perros += this.num(this.f(r.data, 'perros'));
            orgs[name].gatos += this.num(this.f(r.data, 'gatos'));
            orgs[name].capacidad += this.num(this.f(r.data, 'capacidad'));
        });

        return Object.entries(orgs)
            .filter(([, v]) => v.perros + v.gatos > 0)
            .sort((a, b) => (b[1].perros + b[1].gatos) - (a[1].perros + a[1].gatos))
            .slice(0, 15)
            .map(([name, v]) => ({ name, ...v }));
    });

    // ─── Municipio distribution ────────────────────────────────────

    municipioData = computed(() => {
        const counts: Record<string, number> = {};
        this.filteredRecords().forEach(r => {
            const m = this.str(this.f(r.data, 'municipio'));
            if (m) counts[m] = (counts[m] || 0) + 1;
        });
        const colors = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A', '#81C784',
                         '#A5D6A7', '#C8E6C9', '#F9A825', '#1565C0', '#7B1FA2', '#E65100'];
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    });

    // ─── Members panel ───────────────────────────────────────────────

    private buildMember(r: RecRow): MemberRow {
        const nombre = this.str(this.f(r.data, 'nombres', 'apellidos')) || this.str(this.f(r.data, 'nombre'));
        const words = nombre.split(/\s+/).filter(Boolean);
        const initials = words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : (words[0]?.[0] || '?').toUpperCase();
        const rawVin = this.str(this.f(r.data, 'vinculacion'));
        const vinculacion = this.normalizeVinculacion(rawVin);
        const vinColors: Record<string, string> = {
            'Rescatistas': '#2E7D32', 'Fundacion': '#1565C0', 'Albergue / Refugio': '#E65100',
            'Hogar de Paso': '#F9A825', 'Voluntario/a': '#7B1FA2', 'Cuidador/a': '#0891B2', 'Otro': '#94A3B8',
        };
        const perros = this.num(this.f(r.data, 'perros'));
        const gatos = this.num(this.f(r.data, 'gatos'));
        const caballos = this.num(this.f(r.data, 'caballos'));

        return {
            id: r.id, nombre, initials,
            municipio: this.str(this.f(r.data, 'municipio')),
            vinculacion, vinculacionColor: vinColors[vinculacion] || '#94A3B8',
            sexo: this.str(this.f(r.data, 'sexo')),
            edad: this.num(this.f(r.data, 'edad')),
            escolaridad: this.str(this.f(r.data, 'escolaridad')),
            discapacidad: this.str(this.f(r.data, 'discapacidad')),
            saludMental: this.str(this.f(r.data, 'salud', 'mental')),
            telefono: this.str(this.f(r.data, 'telefono', 'celular')) || this.str(this.f(r.data, 'telefono')),
            otroTelefono: this.str(this.f(r.data, 'otro', 'telefono')),
            email: this.str(this.f(r.data, 'correo')),
            direccion: this.str(this.f(r.data, 'direccion')),
            barrio: this.str(this.f(r.data, 'barrio')),
            organizacion: this.str(this.f(r.data, 'nombre', 'hogar')) || this.str(this.f(r.data, 'nombre', 'fundacion')),
            perros, gatos, caballos,
            otros: this.str(this.f(r.data, 'otros')),
            capacidad: this.num(this.f(r.data, 'capacidad')),
            area: this.str(this.f(r.data, 'area')),
            necesidad: this.str(this.f(r.data, 'necesidad')),
            visitaGob: this.str(this.f(r.data, 'visita')),
            adopcion: this.str(this.f(r.data, 'adopcion')),
            emprendimiento: this.str(this.f(r.data, 'emprendimiento')),
            tipoEmprendimiento: this.str(this.f(r.data, 'cual', 'emprendimiento')),
            fuenteIngreso: this.str(this.f(r.data, 'fuente', 'ingreso')),
            donaciones: this.str(this.f(r.data, 'donaciones')),
            victimaViolencia: this.str(this.f(r.data, 'victima', 'violencia')) || this.str(this.f(r.data, 'animal', 'victima')),
            rescates: this.str(this.f(r.data, 'capacidad_operativa', 'rescate')) || this.str(this.f(r.data, 'rescate')),
            apoyoActividades: this.str(this.f(r.data, 'apoyar', 'actividades')),
            antecedentes: this.str(this.f(r.data, 'antecedente')),
            capacitaciones: this.num(this.f(r.data, 'capacitaciones')),
            jornadas: this.num(this.f(r.data, 'jornadas')),
            totalAnimales: perros + gatos + caballos,
        };
    }

    allMembers = computed((): MemberRow[] => {
        return this.filteredRecords().map(r => this.buildMember(r));
    });

    searchedMembers = computed((): MemberRow[] => {
        const q = this.memberSearch().toLowerCase().trim();
        const all = this.allMembers();
        if (!q) return all;
        return all.filter(m =>
            m.nombre.toLowerCase().includes(q) ||
            m.municipio.toLowerCase().includes(q) ||
            m.organizacion.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q)
        );
    });

    paginatedMembers = computed((): MemberRow[] => {
        const start = (this.memberPage() - 1) * this.memberPageSize;
        return this.searchedMembers().slice(start, start + this.memberPageSize);
    });

    memberTotalPages = computed((): number => {
        return Math.max(1, Math.ceil(this.searchedMembers().length / this.memberPageSize));
    });

    toggleMember(id: number): void {
        this.expandedMemberId.set(this.expandedMemberId() === id ? null : id);
    }

    setMemberPage(page: number): void {
        this.memberPage.set(page);
        this.expandedMemberId.set(null);
    }

    onMemberSearch(): void {
        this.memberPage.set(1);
        this.expandedMemberId.set(null);
    }

    // ─── Si/No helper for template ─────────────────────────────────

    isYesValue(val: string): boolean {
        const v = (val || '').toLowerCase();
        return v.includes('si') || v.includes('sí') || v === 'yes';
    }

    // ─── Filter actions ────────────────────────────────────────────

    applyFilters(): void {
        setTimeout(() => this.renderAll(), 100);
    }

    clearFilters(): void {
        this.filterMunicipio.set('');
        this.filterVinculacion.set('');
        this.filterSexo.set('');
        this.filterEdadMin.set(null);
        this.filterEdadMax.set(null);
        setTimeout(() => this.renderAll(), 100);
    }

    // ─── Chart.js ──────────────────────────────────────────────────

    private destroyAll(): void {
        Object.values(this.charts).forEach((c: any) => c?.destroy());
        this.charts = {};
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
        this.renderDonut('cvSexo', this.sexoData(), Chart);
        this.renderEdad(Chart);
        this.renderDonut('cvDiscapacidad', this.discapacidadData(), Chart);
        this.renderAnimales(Chart);
        this.renderMunicipio(Chart);
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
                    borderWidth: 2, borderColor: '#fff', hoverOffset: 6,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const pct = total ? Math.round(ctx.raw / total * 100) : 0;
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    private renderEdad(Chart: any): void {
        const el = document.getElementById('cvEdad') as HTMLCanvasElement;
        if (!el) return;
        const data = this.edadData();
        this.charts['cvEdad'] = new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: '#2E7D32', borderRadius: 4, borderSkipped: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} personas` } },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#666' } },
                    y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                },
            },
        });
    }

    private renderAnimales(Chart: any): void {
        const el = document.getElementById('cvAnimales') as HTMLCanvasElement;
        if (!el) return;
        const data = this.animalesData();
        this.charts['cvAnimales'] = new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderRadius: 4, borderSkipped: false,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} animales` } },
                },
                scales: {
                    x: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                    y: { grid: { display: false }, ticks: { font: { size: 12, weight: 'bold' as const }, color: '#333' } },
                },
            },
        });
    }

    private renderMunicipio(Chart: any): void {
        const el = document.getElementById('cvMunicipio') as HTMLCanvasElement;
        if (!el) return;
        const data = this.municipioData();
        this.charts['cvMunicipio'] = new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderRadius: 4, borderSkipped: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} miembros` } },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#666', maxRotation: 45 } },
                    y: { grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 11 }, color: '#666' } },
                },
            },
        });
    }
}

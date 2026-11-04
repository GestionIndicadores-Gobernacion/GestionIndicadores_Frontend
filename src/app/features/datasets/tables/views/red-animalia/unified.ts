import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AnimaliaChartComponent } from './animalia-chart';
import { ViewerData } from '../../../services/datasets.service';

type Member = ViewerData['records'][number];
type Distribution = { label: string; count: number; percent: number };

export function text(value: unknown): string {
    return value == null ? '' : String(value).trim();
}
export function key(value: unknown): string {
    return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLocaleLowerCase('es');
}
export function animalCount(value: unknown): number | null {
    if (text(value) === '') return null;
    const result = Number(value);
    return Number.isFinite(result) && result >= 0 ? result : null;
}
// Only explicit editions count. A year inside an observation is not participation.
export function editions(value: unknown, kind: 'alimento' | 'jornada'): string[] {
    const years = new Set<string>();
    const pattern = new RegExp(`${kind}\\s*(20\\d{2})(?:\\s*-\\s*(20\\d{2}))?`, 'gi');
    for (const match of text(value).matchAll(pattern)) {
        years.add(match[1]);
        if (match[2]) years.add(match[2]);
    }
    return [...years].sort();
}

@Component({
    selector: 'app-red-animalia-unified',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, AnimaliaChartComponent],
    templateUrl: './unified.html',
    styleUrl: './unified.css',
})
export class RedAnimaliaUnifiedComponent {
    private source = signal<ViewerData | null>(null);
    @Input({ required: true }) set data(value: ViewerData) { this.source.set(value); this.resetPage(); }
    readonly text = text;
    readonly animalCount = animalCount;
    readonly missing = 'Sin dato';
    initials(member: Member): string {
        return this.display(member, 'nombres_y_apellidos').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    }
    detailGroups(member: Member) {
        const fields = this.source()?.fields ?? [];
        const groups = [
            { title: 'Información personal', color: '#2E7D32', fields: [] as { label: string; value: string }[] },
            { title: 'Contacto y ubicación', color: '#1565C0', fields: [] as { label: string; value: string }[] },
            { title: 'Animales y voluntariado', color: '#E65100', fields: [] as { label: string; value: string }[] },
            { title: 'Apoyos y observaciones', color: '#7B1FA2', fields: [] as { label: string; value: string }[] },
        ];
        this.details(member).forEach((field, i) => {
            const name = fields[i].name;
            const group = /municipio|barrio|telefono|correo/.test(name) ? 1
                : /animales|perros|gatos|voluntariado/.test(name) ? 2
                : /alimento|jornada|joranada|observacion/.test(name) ? 3 : 0;
            groups[group].fields.push(field);
        });
        return groups.filter(group => group.fields.length);
    }
    year = signal('');
    municipality = signal('');
    volunteering = signal('');
    sex = signal('');
    age = signal('');
    schooling = signal('');
    supportSelection = signal<{ index: number; year: string } | null>(null);
    search = signal('');
    readonly categoryFilters = {
        ano_de_ingreso_a_la_rav: this.year,
        municipio_de_residencia: this.municipality,
        tipo_de_voluntariado: this.volunteering,
        sexo: this.sex,
        edad: this.age,
        nivel_de_escolaridad: this.schooling,
    };
    readonly categoryLabels = ['Ingreso', 'Municipio', 'Voluntariado', 'Sexo', 'Edad', 'Escolaridad'];
    activeCategories = computed(() => Object.entries(this.categoryFilters)
        .map(([field, value], index) => ({ field, value: value(), label: this.categoryLabels[index] }))
        .filter(item => item.value));
    selectCategory(field: string, label: string) {
        const filter = this.categoryFilters[field as keyof typeof this.categoryFilters];
        if (!filter) return;
        filter.set(key(filter()) === key(label) ? '' : this.options(field).find(value => key(value) === key(label)) ?? label);
        this.resetPage();
    }
    selectSupport(index: number, year: string) {
        const current = this.supportSelection();
        this.supportSelection.set(current?.index === index && current.year === year ? null : { index, year });
        this.resetPage();
    }
    page = signal(1);
    expanded = signal<number | null>(null);
    readonly pageSize = 15;
    records = computed(() => this.source()?.records ?? []);
    total = computed(() => this.records().length);

    value(member: Member, name: string): unknown {
        if (name === 'jornadas') return member.data['jornadas_de_esterilizacion'] ?? member.data['joranadas_de_esterilizacion'];
        return member.data[name];
    }
    display(member: Member, name: string): string { return text(this.value(member, name)) || this.missing; }
    private options(name: string): string[] {
        const labels = new Map<string, string>();
        for (const r of this.records()) {
            const value = this.display(r, name);
            if (value && !labels.has(key(value))) labels.set(key(value), value);
        }
        return [...labels.values()].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    }
    years = computed(() => this.options('ano_de_ingreso_a_la_rav'));
    municipalities = computed(() => this.options('municipio_de_residencia'));
    volunteerTypes = computed(() => this.options('tipo_de_voluntariado'));
    sexes = computed(() => this.options('sexo'));
    filtered = computed(() => {
        const query = key(this.search());
        return this.records().filter(r => {
            if (Object.entries(this.categoryFilters).some(([name, selected]) => selected() && key(this.display(r, name)) !== key(selected()))) return false;
            const support = this.supportSelection();
            if (support && !editions(this.value(r, support.index ? 'jornadas' : 'entregas_de_alimento'), support.index ? 'jornada' : 'alimento').includes(support.year)) return false;
            return !query || Object.values(r.data).some(value => key(value).includes(query));
        });
    });
    private numericSummary(name: string) {
        const values = this.filtered().map(r => animalCount(this.value(r, name))).filter((v): v is number => v !== null);
        return { total: values.length ? values.reduce((a, b) => a + b, 0) : null, reported: values.length };
    }
    dogs = computed(() => this.numericSummary('perros'));
    cats = computed(() => this.numericSummary('gatos'));
    municipalityCount = computed(() => new Set(this.filtered().map(r => key(this.value(r, 'municipio_de_residencia'))).filter(Boolean)).size);
    private distribution(name: string): Distribution[] {
        const groups = new Map<string, { label: string; count: number }>();
        for (const r of this.filtered()) {
            const label = this.display(r, name);
            const id = key(label);
            const entry = groups.get(id) ?? { label, count: 0 };
            entry.count++;
            groups.set(id, entry);
        }
        return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
            .map(group => ({ ...group, percent: this.filtered().length ? group.count / this.filtered().length * 100 : 0 }));
    }
    panels = computed(() => [
        { title: 'Año de ingreso a la RAV', rows: this.distribution('ano_de_ingreso_a_la_rav') },
        { title: 'Municipio de residencia', rows: this.distribution('municipio_de_residencia') },
        { title: 'Tipo de voluntariado', rows: this.distribution('tipo_de_voluntariado') },
        { title: 'Sexo', rows: this.distribution('sexo') },
        { title: 'Nivel de escolaridad', rows: this.distribution('nivel_de_escolaridad') },
    ]);
    ages = computed(() => this.distribution('edad'));
    private support(name: string, kind: 'alimento' | 'jornada') {
        let documented = 0, unspecified = 0, other = 0;
        const years = new Map<string, number>();
        for (const r of this.filtered()) {
            const value = this.value(r, name);
            const list = editions(value, kind);
            if (list.length) {
                documented++;
                list.forEach(year => years.set(year, (years.get(year) ?? 0) + 1));
            } else if (!text(value)) unspecified++;
            else other++;
        }
        return { documented, unspecified, other, years: [...years].sort().map(([year, count]) => ({ year, count })) };
    }
    supports = computed(() => [
        { title: 'Entregas de alimento', ...this.support('entregas_de_alimento', 'alimento') },
        { title: 'Jornadas de esterilización', ...this.support('jornadas', 'jornada') },
    ]);
    // Use the actual imported fields so the expanded record preserves all 19 columns.
    details(member: Member) {
        return (this.source()?.fields ?? []).map(field => ({
            label: field.name === 'joranadas_de_esterilizacion' ? 'Jornadas de esterilización' : field.label || field.name,
            value: this.display(member, field.name),
        }));
    }
    pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
    currentPage = computed(() => Math.min(this.page(), this.pageCount()));
    paginated = computed(() => this.filtered().slice((this.currentPage() - 1) * this.pageSize, this.currentPage() * this.pageSize));
    resetPage() { this.page.set(1); this.expanded.set(null); }
    clearFilters() {
        this.year.set(''); this.municipality.set(''); this.volunteering.set(''); this.sex.set(''); this.search.set(''); this.age.set(''); this.schooling.set(''); this.supportSelection.set(null); this.resetPage();
    }
    changePage(delta: number) { this.page.set(Math.max(1, Math.min(this.pageCount(), this.currentPage() + delta))); this.expanded.set(null); }
    toggle(id: number) { this.expanded.set(this.expanded() === id ? null : id); }
}

import { TestBed } from '@angular/core/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { LUCIDE_ICON_SET } from '../../../../../shared/icons/lucide-icons';
import { RedAnimaliaUnifiedComponent, editions } from './unified';
import { ViewerData } from '../../../services/datasets.service';

export function dataset(rows: Record<string, unknown>[]): ViewerData {
    const names = [...new Set(rows.flatMap(row => Object.keys(row)))];
    return {
        table: { id: 1, name: 'Integrantes', description: '', dataset_id: 1 },
        total: rows.length,
        fields: names.map((name, id) => ({ id, table_id: 1, name, label: name, type: 'text', required: false })),
        records: rows.map((data, id) => ({ id, data })),
    } as ViewerData;
}

describe('Panel for the unified Red Animalia workbook', () => {
    it('preserves age ranges without converting them to zero or guessing exact ages', () => {
        const view = new RedAnimaliaUnifiedComponent();
        view.data = dataset([{ edad: '33-37 años' }, { edad: '33-37 años ' }, { edad: '65 años' }, {}]);
        expect(view.ages().find(row => row.label === '33-37 años')?.count).toBe(2);
        expect(view.ages().find(row => row.label === '65 años')?.count).toBe(1);
        expect(view.ages().find(row => row.label === 'Sin dato')?.count).toBe(1);
    });
    it('keeps blank animals distinct from zero and never adds free text twice', () => {
        const view = new RedAnimaliaUnifiedComponent();
        view.data = dataset([{ perros: 3, gatos: 0, cantidad_de_animales: '3 perros' }, { perros: null, gatos: '', cantidad_de_animales: '50 gatos' }]);
        expect(view.dogs()).toEqual({ total: 3, reported: 1 });
        expect(view.cats()).toEqual({ total: 0, reported: 1 });
        view.data = dataset([{ perros: '', gatos: null }]);
        expect(view.dogs().total).toBeNull();
        expect(view.display(view.records()[0], 'gatos')).toBe('Sin dato');
    });

    it('counts explicit support years per member, not events or negative responses', () => {
        expect(editions('Alimento 2024-2025', 'alimento')).toEqual(['2024', '2025']);
        expect(editions('Jornada 2024-Jornada 2024', 'jornada')).toEqual(['2024']);
        expect(editions('No recibió cupos en 2025', 'jornada')).toEqual([]);
        expect(editions('Jornada 2024-En 2025 no participó', 'jornada')).toEqual(['2024']);
        const view = new RedAnimaliaUnifiedComponent();
        view.data = dataset([{ entregas_de_alimento: 'Alimento 2024-2025' }, { entregas_de_alimento: 'NO' }, {}]);
        expect(view.supports()[0]).toMatchObject({ documented: 1, other: 1, unspecified: 1, years: [{ year: '2024', count: 1 }, { year: '2025', count: 1 }] });
    });

    it('filters every summary and resets pagination while preserving raw categories and observations', () => {
        const view = new RedAnimaliaUnifiedComponent();
        view.data = dataset(Array.from({ length: 449 }, (_, i) => ({ nombres_y_apellidos: `Integrante ${i}`, ano_de_ingreso_a_la_rav: i ? 2024 : 2026, municipio_de_residencia: i ? 'CALI ' : 'Palmira', tipo_de_voluntariado: 'Beneficios', observaciones: i ? '' : 'Seguimiento pendiente', perros: 1 })));
        expect(view.total()).toBe(449);
        expect(view.pageCount()).toBe(30);
        expect(view.panels()[2].rows[0].label).toBe('Beneficios');
        view.changePage(29);
        view.search.set('seguimiento');
        view.resetPage();
        expect(view.paginated().length).toBe(1);
        expect(view.dogs().total).toBe(1);
        expect(view.currentPage()).toBe(1);
        view.clearFilters();
        view.year.set('2026');
        expect(view.filtered().length).toBe(1);
        view.clearFilters();
        expect(view.filtered().length).toBe(449);
    });

    it('renders source fields and omits unsupported indicators', async () => {
        await TestBed.configureTestingModule({ imports: [RedAnimaliaUnifiedComponent], providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LUCIDE_ICON_SET) }] }).compileComponents();
        const fixture = TestBed.createComponent(RedAnimaliaUnifiedComponent);
        const row = { ano_de_ingreso_a_la_rav: 2026, cedula: '000123', nombres_y_apellidos: 'Integrante de prueba', edad: 30, sexo: 'Mujer', nivel_de_escolaridad: 'Profesional', area_de_estudio: 'Veterinaria', municipio_de_residencia: 'Cali', indique_el_barrio: 'Centro', telefono: '000', otro_telefono: '', correo_electronico: 'prueba@example.com', cantidad_de_animales: '3 perros y 2 gatos', entregas_de_alimento: 'Alimento 2025', joranadas_de_esterilizacion: 'Jornada 2025', tipo_de_voluntariado: 'Hogar de paso', perros: 3, gatos: 2, observaciones: 'Observación completa' };
        fixture.componentRef.setInput('data', dataset([row]));
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.textContent).toContain('Entregas de alimento');
        for (const absent of ['Capacidad de Albergue', 'Discapacidad', 'Capacitaciones', 'Caballos', 'Necesidades Principales']) expect(element.textContent).not.toContain(absent);
        (element.querySelector('.member-toggle') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(element.querySelectorAll('dd').length).toBe(19);
        expect(element.textContent).toContain('Observación completa');
        expect(element.textContent).toContain('000123');
        fixture.componentInstance.search.set('no coincide');
        fixture.componentInstance.resetPage();
        fixture.detectChanges();
        expect(element.textContent).toContain('No hay integrantes que coincidan');
    });
});

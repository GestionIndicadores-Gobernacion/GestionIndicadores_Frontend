import { TestBed } from '@angular/core/testing';
import { RedAnimaliaViewComponent } from './view';
import { DatasetService } from '../../../services/datasets.service';

describe('Red Animalia unified workbook', () => {
    function component(records: Record<string, unknown>[]) {
        TestBed.configureTestingModule({ providers: [{ provide: DatasetService, useValue: {} }] });
        const view = TestBed.runInInjectionContext(() => new RedAnimaliaViewComponent(TestBed.inject(DatasetService)));
        view.viewerData.set({ records: records.map((data, id) => ({ id, data })) } as any);
        return view;
    }

    it('uses new columns for membership, filters, and sterilization participation', () => {
        const view = component([
            { nombres_y_apellidos: 'Integrante', municipio_de_residencia: 'Cali', tipo_de_voluntariado: 'Rescatista', joranadas_de_esterilizacion: 2, nivel_de_escolaridad: 'Profesional', perros: 3, gatos: 2 },
            { nombres_y_apellidos: 'Otro integrante', municipio_de_residencia: 'Palmira' },
        ]);
        expect(view.kpis().total).toBe(2);
        expect(view.allMembers()[0].jornadas).toBe(2);
        expect(view.allMembers()[0].escolaridad).toBe('Profesional');
        expect(view.vinculacionesNorm()).toEqual(['Rescatistas']);
        view.filterVinculacion.set('Rescatistas');
        expect(view.filteredRecords().length).toBe(1);
        expect(view.kpis().totalAnimales).toBe(5);
    });

    it('continues to read the legacy workbook', () => {
        const view = component([{ nombres_y_apellidos: 'Integrante', tipo_de_vinculacion_dentro_de_la_red_animalia_valle: 'Fundación', jornadas: 3 }]);
        expect(view.allMembers()[0].vinculacion).toBe('Fundacion');
        expect(view.allMembers()[0].jornadas).toBe(3);
    });

    it('reads textual editions without treating observations as attendance', () => {
        const view = component([
            { joranadas_de_esterilizacion: 'Jornada 2024-Jornada 2025' },
            { joranadas_de_esterilizacion: 'Jornada 2024-2025' },
            { joranadas_de_esterilizacion: 'No recibio los cupos' },
            { joranadas_de_esterilizacion: 'Jornada 2024-En el 2025 manifesto que ya habia esterilizado' },
        ]);
        expect(view.allMembers().map(member => member.jornadas)).toEqual([2, 2, 0, 1]);
        expect(view.programasData()[1].pct).toBe(75);
    });
});

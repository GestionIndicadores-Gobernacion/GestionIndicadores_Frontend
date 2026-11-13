import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { UpdateDatasetModalComponent } from './update-dataset-modal';
import { DatasetService } from '../../services/datasets.service';

describe('UpdateDatasetModal — dashboard del dataset', () => {
    const incompatible = {
        status: 409,
        error: {
            code: 'DATASET_TYPE_INCOMPATIBLE',
            message: 'El archivo no es compatible',
            expected_type: 'presupuesto',
            expected_type_label: 'Presupuesto (Z080)',
            detected_type: 'generico',
            detected_type_label: 'Genérico',
            missing_columns: ['presup_disponible o presup_dispon'],
        },
    };
    const ok = {
        dataset_id: 23, dataset_name: 'Z080', tables_created: 1, fields_created: 3,
        records_inserted: 5, file_processed: true, dataset_type: 'presupuesto',
        dataset_type_label: 'Presupuesto (Z080)', warnings: [],
    };

    function setup(update: ReturnType<typeof vi.fn>) {
        TestBed.configureTestingModule({
            providers: [
                { provide: DatasetService, useValue: { updateFromExcel: update } },
                { provide: ChangeDetectorRef, useValue: { detectChanges: () => { } } },
            ],
        });
        const modal = TestBed.runInInjectionContext(() =>
            new UpdateDatasetModalComponent(TestBed.inject(DatasetService), TestBed.inject(ChangeDetectorRef)));
        modal.dataset = { id: 23, name: 'Z080', active: true, created_at: '' };
        modal.ngOnInit();
        modal.selectedFile = new File(['x'], 'Z080 - julio.xlsx');
        return modal;
    }

    afterEach(() => vi.restoreAllMocks());

    it('pide confirmación ante un 409 y no reintenta si el usuario cancela', async () => {
        const update = vi.fn().mockReturnValue(throwError(() => incompatible));
        const fire = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as any);
        const modal = setup(update);

        modal.upload();
        await Promise.resolve();

        expect(update).toHaveBeenCalledTimes(1);
        expect(update.mock.calls[0][3]).toBe(false);
        const opts = fire.mock.calls[0][0] as any;
        expect(opts.html).toContain('Presupuesto (Z080)');
        expect(opts.html).toContain('presup_disponible o presup_dispon');
        expect(modal.uploading).toBe(false);
    });

    it('reintenta con allow_type_change solo tras confirmar', async () => {
        const update = vi.fn()
            .mockReturnValueOnce(throwError(() => incompatible))
            .mockReturnValueOnce(of(ok));
        vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as any);
        const modal = setup(update);
        const updated = vi.fn();
        modal.updated.subscribe(updated);

        modal.upload();
        await Promise.resolve();
        await Promise.resolve();

        expect(update).toHaveBeenCalledTimes(2);
        expect(update.mock.calls[1][3]).toBe(true);
        expect(updated).toHaveBeenCalled();
    });

    it('muestra el dashboard resultante y las columnas que ya no vienen', () => {
        const update = vi.fn().mockReturnValue(of({
            ...ok, warnings: ['Columnas que ya no vienen en el archivo: <b>x</b>'],
        }));
        const fire = vi.spyOn(Swal, 'fire').mockResolvedValue({} as any);
        const modal = setup(update);

        modal.upload();

        const opts = fire.mock.calls[0][0] as any;
        expect(opts.icon).toBe('warning');
        expect(opts.html).toContain('Dashboard: Presupuesto (Z080).');
        expect(opts.html).toContain('&lt;b&gt;x&lt;/b&gt;');   // escapado
    });
});

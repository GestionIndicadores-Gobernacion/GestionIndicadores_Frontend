import { Injectable, ChangeDetectorRef } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../core/models/component.model';
import { DatasetService } from '../../../../../core/services/datasets.service';

@Injectable({ providedIn: 'root' })
export class IndicatorDatasetService {

    constructor(
        private datasetService: DatasetService,
    ) { }

    loadOptions(
        indicators: ComponentIndicatorModel[],
        datasetOptions: Record<number, any[]>,
        datasetLoading: Record<number, boolean>,
        datasetError: Record<number, string>,
        cdr: ChangeDetectorRef,
        municipality?: string | null
    ) {

        indicators.forEach(ind => {

            if (ind.field_type !== 'dataset_select' && ind.field_type !== 'dataset_multi_select')
                return;

            const datasetId = ind.config?.dataset_id;
            if (!datasetId) return;

            datasetLoading[ind.id!] = true;

            this.datasetService.getRecordsByDataset(datasetId).subscribe({

                next: (rows) => {
                    let data = rows || [];

                    if (municipality) {
                        const m = municipality.toLowerCase().trim();
                        data = data.filter(r => {
                            const recordMunicipio = String(r.data?.['municipio_de_residencia'] || '')
                                .toLowerCase().trim();
                            return recordMunicipio === m;
                        });
                    }

                    const labelField = ind.config?.label_field || 'nombres_y_apellidos';

                    // ← si hay label_field configurado, filtrar solo registros que tengan ese campo
                    if (ind.config?.label_field) {
                        data = data.filter(r =>
                            r.data?.[labelField] !== undefined &&
                            r.data?.[labelField] !== null &&
                            r.data?.[labelField] !== ''
                        );
                    }

                    datasetOptions[ind.id!] = data.map(r => ({
                        id: r.id,
                        label: r.data?.[labelField] || 'Registro'
                    }));

                    datasetLoading[ind.id!] = false;
                    cdr.markForCheck();
                },
                error: () => {
                    datasetError[ind.id!] = 'Error cargando dataset';
                    datasetLoading[ind.id!] = false;
                    cdr.markForCheck();
                }

            });

        });

    }

    private fallbackToAll(
        ind: ComponentIndicatorModel,
        options: Record<number, { id: number; label: string }[]>,
        loading: Record<number, boolean>,
        errors: Record<number, string>,
        cdr: ChangeDetectorRef
    ): void {
        this.datasetService.getAll().subscribe({
            next: (datasets) => {
                options[ind.id!] = datasets.map(d => ({ id: d.id, label: d.name }));
                loading[ind.id!] = false;
                cdr.markForCheck();
            },
            error: () => {
                errors[ind.id!] = 'Error al cargar opciones';
                loading[ind.id!] = false;
                cdr.markForCheck();
            }
        });
    }

    private loadAll(
        ind: ComponentIndicatorModel,
        options: Record<number, { id: number; label: string }[]>,
        loading: Record<number, boolean>,
        errors: Record<number, string>,
        cdr: ChangeDetectorRef
    ): void {
        this.datasetService.getAll().subscribe({
            next: (datasets) => {
                options[ind.id!] = datasets.map(d => ({ id: d.id, label: d.name }));
                loading[ind.id!] = false;
                cdr.markForCheck();
            },
            error: () => {
                errors[ind.id!] = 'Error al cargar datasets';
                loading[ind.id!] = false;
                cdr.markForCheck();
            }
        });
    }
}
import { Injectable, ChangeDetectorRef } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../core/models/component.model';
import { DatasetService } from '../../../../../core/services/datasets.service';

@Injectable({ providedIn: 'root' })
export class IndicatorDatasetService {

    constructor(private datasetService: DatasetService) { }

    loadOptions(
        indicators: ComponentIndicatorModel[],
        options: Record<number, { id: number; label: string }[]>,
        loading: Record<number, boolean>,
        errors: Record<number, string>,
        cdr: ChangeDetectorRef
    ): void {
        indicators.forEach(ind => {
            if (!['dataset_select', 'dataset_multi_select'].includes(ind.field_type)) return;
            if (options[ind.id!]?.length) {
                loading[ind.id!] = false;
                cdr.markForCheck();
                return;
            }

            loading[ind.id!] = true;
            errors[ind.id!] = '';

            const datasetId = ind.config?.dataset_id;

            if (datasetId) {
                this.datasetService.getRecordsByDataset(datasetId).subscribe({
                    next: (records: any[]) => {
                        options[ind.id!] = records.map(r => ({
                            id: r.id,
                            label: r.data?.[ind.config?.label_field] || r.data?.nombre || String(r.id)
                        }));
                        loading[ind.id!] = false;
                        cdr.markForCheck(); // o detectChanges()
                    },
                    error: () => {
                        errors[ind.id!] = 'Error al cargar opciones';
                        loading[ind.id!] = false;
                        cdr.markForCheck();
                    }
                });
            } else {
                this.loadAll(ind, options, loading, errors, cdr);
            }
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
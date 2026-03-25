// strategy-metrics/metric-type.config.ts

export type MetricType =
    | 'report_count'
    | 'report_sum'
    | 'report_sum_nested'
    | 'dataset_sum'
    | 'dataset_count'
    | 'manual';

export interface MetricTypeMeta {
    label: string;
    shortLabel: string;
    hint: string;
    badgeClass: string;
}

export const METRIC_TYPE_META: Record<MetricType, MetricTypeMeta> = {
    report_count: {
        label: 'Conteo de reportes',
        shortLabel: 'Conteo',
        hint: 'Cuenta los reportes registrados del componente',
        badgeClass: 'bg-blue-100 text-blue-700',
    },
    report_sum: {
        label: 'Suma de campo en reporte',
        shortLabel: 'Suma campo',
        hint: 'Suma un campo numérico plano de los reportes',
        badgeClass: 'bg-indigo-100 text-indigo-700',
    },
    report_sum_nested: {
        label: 'Suma de campo anidado en reporte',
        shortLabel: 'Suma anidada',
        hint: 'Suma un campo numérico dentro de una estructura JSON anidada (ej: animales esterilizados)',
        badgeClass: 'bg-violet-100 text-violet-700',
    },
    dataset_sum: {
        label: 'Base de datos externa (suma)',
        shortLabel: 'Dataset suma',
        hint: 'Suma una columna de una base de datos externa cargada mensualmente',
        badgeClass: 'bg-emerald-100 text-emerald-700',
    },
    dataset_count: {
        label: 'Base de datos externa (conteo)',
        shortLabel: 'Dataset conteo',
        hint: 'Cuenta los registros válidos de una base de datos externa cargada mensualmente',
        badgeClass: 'bg-teal-100 text-teal-700',
    },
    manual: {
        label: 'Registro manual',
        shortLabel: 'Manual',
        hint: 'El valor se ingresa manualmente cada período',
        badgeClass: 'bg-amber-100 text-amber-700',
    },
};

export const TYPES_WITH_FIELD_NAME: MetricType[] = ['report_sum', 'report_sum_nested', 'dataset_sum'];
export const TYPES_WITH_DATASET: MetricType[] = ['dataset_sum', 'dataset_count'];
export const TYPES_WITH_MANUAL_VALUE: MetricType[] = ['manual'];
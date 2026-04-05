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
    steps: string[];  // ← nuevo: pasos de guía
}

export const METRIC_TYPE_META: Record<MetricType, MetricTypeMeta> = {
    report_count: {
        label: 'Conteo de reportes',
        shortLabel: 'Conteo',
        hint: 'Cuenta los reportes registrados del componente',
        badgeClass: 'bg-blue-100 text-blue-700',
        steps: [
            'Selecciona el componente cuyos reportes quieres contar.',
            'Opcionalmente filtra por año para que solo cuente reportes de ese período.',
            'El sistema contará automáticamente cuántos reportes se han registrado.',
        ],
    },
    report_sum: {
        label: 'Suma de campo en reporte',
        shortLabel: 'Suma campo',
        hint: 'Suma un campo numérico plano de los reportes',
        badgeClass: 'bg-indigo-100 text-indigo-700',
        steps: [
            'Selecciona el componente que genera los reportes.',
            'En "ID del indicador" escribe el ID numérico del campo a sumar (ej: 137).',
            'El sistema sumará el valor de ese indicador en todos los reportes del año.',
        ],
    },
    report_sum_nested: {
        label: 'Suma de campo anidado en reporte',
        shortLabel: 'Suma anidada',
        hint: 'Suma un campo numérico dentro de una estructura JSON anidada',
        badgeClass: 'bg-violet-100 text-violet-700',
        steps: [
            'Selecciona el componente que genera los reportes.',
            'En "ID del indicador" escribe el ID del indicador con estructura anidada (ej: 99).',
            'El sistema buscará dentro del JSON el campo configurado y sumará sus valores.',
        ],
    },
    dataset_sum: {
        label: 'Base de datos externa (suma)',
        shortLabel: 'Dataset suma',
        hint: 'Suma una columna de una base de datos externa cargada mensualmente',
        badgeClass: 'bg-emerald-100 text-emerald-700',
        steps: [
            'Selecciona el dataset (base de datos) que se carga mensualmente.',
            'En "Columna en el dataset" escribe el nombre exacto de la columna a sumar (ej: personas_capacitadas).',
            'Filtra por año si el dataset acumula datos de varios períodos.',
        ],
    },
    dataset_count: {
        label: 'Base de datos externa (conteo)',
        shortLabel: 'Dataset conteo',
        hint: 'Cuenta los registros válidos de una base de datos externa',
        badgeClass: 'bg-teal-100 text-teal-700',
        steps: [
            'Selecciona el dataset (base de datos) que se carga mensualmente.',
            'El sistema contará los registros que tengan el campo "mes" diligenciado.',
            'Filtra por año si necesitas aislar un período específico.',
        ],
    },
    manual: {
        label: 'Registro manual',
        shortLabel: 'Manual',
        hint: 'El valor se ingresa manualmente cada período',
        badgeClass: 'bg-amber-100 text-amber-700',
        steps: [
            'Selecciona el año al que aplica este valor.',
            'Ingresa el valor acumulado registrado para ese año.',
            'Para registrar valores de otros años, agrega una nueva medición manual con el año correspondiente.',
        ],
    },
};

export const TYPES_WITH_FIELD_NAME: MetricType[] = ['report_sum', 'report_sum_nested', 'dataset_sum'];
export const TYPES_WITH_DATASET: MetricType[] = ['dataset_sum', 'dataset_count'];
export const TYPES_WITH_MANUAL_VALUE: MetricType[] = ['manual'];
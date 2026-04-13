import { ComponentIndicatorModel } from '../../../../../../features/report/models/component.model';

export function toNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return isNaN(n) ? 0 : n;
}

function cleanRedAnimalia(val: any): void {
    const ra = val.sub_sections?.['red_animalia'];
    if (ra?.actors) {
        ra.actors = ra.actors.filter(
            (a: any) => typeof a === 'object' && a !== null && a.actor_id
        );
    }
}

export function initializeCategorizedGroup(
    val: any,
    ind: ComponentIndicatorModel
): void {
    if (!val.selected_categories) val.selected_categories = [];
    if (!val.data) val.data = {};
    if (!val.sub_sections) val.sub_sections = {};

    const metrics: any[] = ind.config?.metrics || [];
    const groups: string[] = ind.config?.groups || [];
    const subSections: any[] = ind.config?.sub_sections || [];

    val.selected_categories.forEach((cat: string) => {
        if (!val.data[cat]) val.data[cat] = {};
        groups.forEach((group: string) => {
            if (!val.data[cat][group]) val.data[cat][group] = {};
            metrics.forEach((metric: any) => {
                if (!(metric.key in val.data[cat][group])) val.data[cat][group][metric.key] = 0;
            });
        });
    });

    Object.keys(val.data).forEach(cat => {
        if (!val.selected_categories.includes(cat)) delete val.data[cat];
    });

    subSections.forEach((section: any) => {

        // Red Animalia se maneja aparte, nunca inicializar como sub_section numérica
        // Además limpia actores corruptos que puedan venir del servidor
        if (section.key === 'red_animalia') {
            cleanRedAnimalia(val);
            return;
        }

        if (!val.sub_sections[section.key]) val.sub_sections[section.key] = {};
        val.selected_categories.forEach((cat: string) => {
            if (!val.sub_sections[section.key][cat]) val.sub_sections[section.key][cat] = {};
            metrics.forEach((metric: any) => {
                if (!(metric.key in val.sub_sections[section.key][cat])) {
                    val.sub_sections[section.key][cat][metric.key] = 0;
                }
            });
        });
        Object.keys(val.sub_sections[section.key]).forEach(cat => {
            if (!val.selected_categories.includes(cat)) delete val.sub_sections[section.key][cat];
        });
    });
}

export function getCategoryMetricTotal(
    values: Record<number, any>,
    indicatorId: number,
    category: string,
    metricKey: string
): number {
    const data = values[indicatorId]?.data?.[category];
    if (!data) return 0;
    return Object.values(data).reduce(
        (sum: number, groupData: any) => sum + (Number(groupData?.[metricKey]) || 0), 0
    );
}

export function getCategorizedGrandTotal(
    values: Record<number, any>,
    ind: ComponentIndicatorModel
): number {
    return (ind.config?.metrics || []).reduce((sum: number, m: any) => {
        const data = values[ind.id!]?.data || {};
        let metricTotal = 0;
        Object.values(data).forEach((catData: any) => {
            Object.values(catData).forEach((groupData: any) => {
                metricTotal += Number(groupData?.[m.key]) || 0;
            });
        });
        return sum + metricTotal;
    }, 0);
}

export function sanitizeEmit(
    values: Record<number, any>,
    activeIndicators: ComponentIndicatorModel[]
): Record<number, any> {
    const sanitized: Record<number, any> = {};

    activeIndicators.forEach(ind => {
        const id = ind.id!;
        const raw = values[id];

        switch (ind.field_type) {
            case 'number':
                sanitized[id] = toNumber(raw);
                break;

            case 'sum_group':
                if (raw && typeof raw === 'object') {
                    const copy: Record<string, number> = {};
                    Object.keys(raw).forEach(k => { copy[k] = toNumber(raw[k]); });
                    sanitized[id] = copy;
                } else {
                    sanitized[id] = {};
                }
                break;

            case 'grouped_data':
                if (raw && typeof raw === 'object') {
                    const groupCopy: Record<string, any> = {};
                    Object.keys(raw).forEach(groupKey => {
                        groupCopy[groupKey] = {};
                        const subFields: any[] = ind.config?.sub_fields || [];
                        subFields.forEach((sf: any) => {
                            const v = raw[groupKey]?.[sf.name];
                            groupCopy[groupKey][sf.name] = sf.type === 'number' ? toNumber(v) : (v ?? '');
                        });
                    });
                    sanitized[id] = groupCopy;
                } else {
                    sanitized[id] = {};
                }
                break;

            case 'categorized_group':
                if (raw) {
                    const clone = JSON.parse(JSON.stringify(raw));

                    // Sanitizar solo clone.data (valores numéricos)
                    if (clone.data) {
                        Object.keys(clone.data).forEach(cat => {
                            Object.keys(clone.data[cat]).forEach(group => {
                                Object.keys(clone.data[cat][group]).forEach(mk => {
                                    clone.data[cat][group][mk] = toNumber(clone.data[cat][group][mk]);
                                });
                            });
                        });
                    }

                    // Sanitizar sub_sections numéricas, protegiendo red_animalia
                    if (clone.sub_sections) {
                        Object.keys(clone.sub_sections).forEach(sectionKey => {

                            if (sectionKey === 'red_animalia') {
                                // Limpiar actores corruptos (valores que no sean objetos válidos)
                                const ra = clone.sub_sections['red_animalia'];
                                if (ra?.actors) {
                                    ra.actors = ra.actors.filter(
                                        (a: any) => typeof a === 'object' && a !== null && a.actor_id
                                    );
                                }
                                return;
                            }

                            const section = clone.sub_sections[sectionKey];
                            if (section && typeof section === 'object') {
                                Object.keys(section).forEach(cat => {
                                    if (section[cat] && typeof section[cat] === 'object') {
                                        Object.keys(section[cat]).forEach(mk => {
                                            section[cat][mk] = toNumber(section[cat][mk]);
                                        });
                                    }
                                });
                            }
                        });
                    }

                    sanitized[id] = clone;
                }
                break;

            default:
                sanitized[id] = raw ?? null;
        }
    });

    return sanitized;
}
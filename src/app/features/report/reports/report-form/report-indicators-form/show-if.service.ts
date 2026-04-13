import { Injectable } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../features/report/models/component.model';

@Injectable({ providedIn: 'root' })
export class ShowIfService {

    isVisible(
        ind: ComponentIndicatorModel,
        indicators: ComponentIndicatorModel[],
        values: Record<number, any>
    ): boolean {

        const showIf = ind.config?.show_if;
        if (!showIf) return true;

        const parent = indicators.find(i => i.name === showIf.indicator_name);
        if (!parent) return false;

        const actualValue = values[parent.id!];

        // 🔴 si el usuario aún no respondió el campo padre
        if (
            actualValue === undefined ||
            actualValue === null ||
            actualValue === '' ||
            (Array.isArray(actualValue) && actualValue.length === 0)
        ) {
            return false;
        }

        if (Array.isArray(actualValue)) {
            return actualValue.includes(showIf.value);
        }

        return actualValue === showIf.value;
    }

    clearInactiveValues(
        indicators: ComponentIndicatorModel[],
        values: Record<number, any>,
        isVisible: (ind: ComponentIndicatorModel) => boolean
    ): void {
        indicators.forEach(ind => {
            if (!ind.config?.show_if) return;
            if (!isVisible(ind)) delete values[ind.id!];
        });
    }
}
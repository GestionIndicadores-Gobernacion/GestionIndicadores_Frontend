import { Injectable } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../features/report/models/component.model';

@Injectable({ providedIn: 'root' })
export class IndicatorGroupService {

    getGroups(indicators: ComponentIndicatorModel[]): Record<string, ComponentIndicatorModel[]> {
        const map: Record<string, ComponentIndicatorModel[]> = {};
        indicators.forEach(ind => {
            if (ind.group_name) {
                if (!map[ind.group_name]) map[ind.group_name] = [];
                map[ind.group_name].push(ind);
            }
        });
        return map;
    }

    initGroupModes(
        indicators: ComponentIndicatorModel[],
        values: Record<number, any>,
        selectedGroupMode: Record<string, number | null>
    ): void {
        const groups = this.getGroups(indicators);
        Object.keys(groups).forEach(groupName => {
            if (groupName in selectedGroupMode) return;
            const members = groups[groupName];
            const withValue = members.find(m => values[m.id!] != null);
            selectedGroupMode[groupName] = withValue?.id ?? members[0].id ?? null;
        });
    }

    getActiveIndicators(
        indicators: ComponentIndicatorModel[],
        selectedGroupMode: Record<string, number | null>,
        isVisible: (ind: ComponentIndicatorModel) => boolean
    ): ComponentIndicatorModel[] {
        return indicators.filter(ind => {
            if (ind.group_name && selectedGroupMode[ind.group_name] !== ind.id) return false;
            if (!isVisible(ind)) return false;
            return true;
        });
    }
}
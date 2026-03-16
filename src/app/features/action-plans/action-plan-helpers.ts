// action-plan-helpers.ts

import { ActionPlanActivityModel, ActionPlanStatus } from "../../core/models/action-plan.model";

export function parseDateOnly(dateStr: string): { y: number; m: number; d: number } {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { y, m: m - 1, d };
}

export function activityFallsOnDay(
    activity: ActionPlanActivityModel,
    date: Date,
    calYear: number,
    calMonth: number
): boolean {
    const { y, m, d } = parseDateOnly(activity.delivery_date);
    if (y !== calYear || m !== calMonth) return false;
    return d === date.getDate() && m === date.getMonth() && y === date.getFullYear();
}

export function statusClass(status: ActionPlanStatus): string {
    const map: Record<ActionPlanStatus, string> = {
        'Realizado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'En Ejecución': 'bg-blue-50 text-blue-700 border-blue-200',
        'Pendiente': 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status];
}

export function statusDot(status: ActionPlanStatus): string {
    const map: Record<ActionPlanStatus, string> = {
        'Realizado': 'bg-emerald-500',
        'En Ejecución': 'bg-blue-500',
        'Pendiente': 'bg-red-500',
    };
    return map[status];
}
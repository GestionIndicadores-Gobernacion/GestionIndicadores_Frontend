import { Pipe, PipeTransform } from '@angular/core';
import { ActionPlanModel, ActionPlanStatus } from '../../../features/action-plans/models/action-plan.model';

@Pipe({ name: 'plansCountByStatus', standalone: true })
export class PlansCountByStatusPipe implements PipeTransform {
  transform(plans: ActionPlanModel[], status: ActionPlanStatus | 'all'): number {
    let count = 0;
    for (const plan of plans) {
      for (const obj of plan.plan_objectives ?? []) {
        for (const activity of obj.activities ?? []) {
          if (status === 'all' || activity.status === status) count++;
        }
      }
    }
    return count;
  }
}
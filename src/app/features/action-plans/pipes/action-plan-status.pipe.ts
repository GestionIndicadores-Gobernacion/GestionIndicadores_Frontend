import { Pipe, PipeTransform } from '@angular/core';
import { ActionPlanModel, ActionPlanStatus } from '../../../core/models/action-plan.model';

@Pipe({ name: 'plansCountByStatus', standalone: true })
export class PlansCountByStatusPipe implements PipeTransform {
  transform(plans: ActionPlanModel[], status: ActionPlanStatus): number {
    let count = 0;
    for (const plan of plans) {
      for (const obj of plan.plan_objectives ?? []) {
        for (const activity of obj.activities ?? []) {
          if (activity.status === status) count++;
        }
      }
    }
    return count;
  }
}
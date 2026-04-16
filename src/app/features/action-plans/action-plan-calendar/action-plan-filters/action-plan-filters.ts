import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ActionPlanStatus } from '../../../../features/action-plans/models/action-plan.model';
import { StrategyModel } from '../../../../features/report/models/strategy.model';
import { ComponentModel } from '../../../../features/report/models/component.model';

@Component({
  selector: 'app-action-plan-filters',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './action-plan-filters.html',
})
export class ActionPlanFiltersComponent {

  @Input() strategies: StrategyModel[] = [];
  @Input() filteredComponents: ComponentModel[] = [];
  @Input() selectedStrategyId: number | null = null;
  @Input() activeStatusFilter: 'all' | ActionPlanStatus = 'all';
  @Input() filterByBoss = false;
  @Input() filteredPlansCount = 0;
  @Input() selectedDayFilter: Date | null = null;

  @Output() strategyChange = new EventEmitter<number | null>();
  @Output() componentChange = new EventEmitter<number | null>();
  @Output() statusChange = new EventEmitter<'all' | ActionPlanStatus>();
  @Output() bossChange = new EventEmitter<boolean>();
  @Output() clearDayFilter = new EventEmitter<void>();

  @Input() filterMyPlans = false;
  @Output() myPlansChange = new EventEmitter<boolean>();

  onStrategyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.strategyChange.emit(val ? +val : null);
  }

  onComponentChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.componentChange.emit(val ? +val : null);
  }
}
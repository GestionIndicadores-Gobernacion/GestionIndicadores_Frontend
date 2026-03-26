import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecurrenceFrequency } from '../../../../../core/models/action-plan.model';

export interface RecurrenceForm {
  enabled:      boolean;
  frequency:    RecurrenceFrequency;
  until:        string;
  day_of_month: number | null;
  day_of_week:  number | null;
  interval:     number;
}

@Component({
  selector: 'app-action-plan-recurrence-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './action-plan-recurrence-panel.html',
})
export class ActionPlanRecurrencePanelComponent {

  @Input() recurrence!: RecurrenceForm;
  @Input() delivery_date = '';
  @Input() namePrefix = '';  // para names únicos en el form
  @Output() recurrenceChange = new EventEmitter<RecurrenceForm>();

  readonly FREQUENCY_OPTIONS = [
    { value: 'daily',    label: 'Diaria' },
    { value: 'weekly',   label: 'Semanal' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly',  label: 'Mensual' },
    { value: 'yearly',   label: 'Anual' },
    { value: 'custom',   label: 'Personalizada' },
  ] as const;

  readonly WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  get showDayOfMonth(): boolean { return this.recurrence.frequency === 'monthly'; }
  get showDayOfWeek(): boolean  { return this.recurrence.frequency === 'weekly' || this.recurrence.frequency === 'biweekly'; }
  get showInterval(): boolean   { return this.recurrence.frequency === 'custom'; }

  get preview(): string {
    if (!this.recurrence.enabled || !this.delivery_date || !this.recurrence.until) return '';
    const count = this.estimateOccurrences();
    return `≈ ${count} ocurrencias`;
  }

  private estimateOccurrences(): number {
    const start = new Date(this.delivery_date);
    const until = new Date(this.recurrence.until);
    if (until < start) return 0;
    const diff = Math.ceil((until.getTime() - start.getTime()) / 86400000);
    const f = this.recurrence.frequency;
    if (f === 'daily')    return diff + 1;
    if (f === 'weekly')   return Math.floor(diff / 7) + 1;
    if (f === 'biweekly') return Math.floor(diff / 14) + 1;
    if (f === 'monthly')  return Math.floor(diff / 30) + 1;
    if (f === 'yearly')   return Math.floor(diff / 365) + 1;
    if (f === 'custom')   return Math.floor(diff / (this.recurrence.interval || 7)) + 1;
    return 1;
  }

  toggle(): void {
    this.recurrence.enabled = !this.recurrence.enabled;
    this.recurrenceChange.emit(this.recurrence);
  }
}
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-action-plan-calendar-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-plan-calendar-nav.html',
})
export class ActionPlanCalendarNavComponent {

  @Input() currentDate = new Date();
  @Input() viewMode: 'calendar' | 'agenda' = 'calendar';

  @Output() monthChange    = new EventEmitter<Date>();
  @Output() viewModeChange = new EventEmitter<'calendar' | 'agenda'>();

  readonly MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  get availableYears(): number[] {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
  }

  prevMonth(): void {
    this.monthChange.emit(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1));
  }

  nextMonth(): void {
    this.monthChange.emit(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1));
  }

  goToToday(): void {
    this.monthChange.emit(new Date());
  }

  onMonthSelect(event: Event): void {
    const month = +(event.target as HTMLSelectElement).value;
    this.monthChange.emit(new Date(this.currentDate.getFullYear(), month, 1));
  }

  onYearSelect(event: Event): void {
    const year = +(event.target as HTMLSelectElement).value;
    this.monthChange.emit(new Date(year, this.currentDate.getMonth(), 1));
  }
}
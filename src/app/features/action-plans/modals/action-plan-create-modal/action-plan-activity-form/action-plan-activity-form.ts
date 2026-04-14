import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionPlanRecurrencePanelComponent, RecurrenceForm } from '../action-plan-recurrence-panel/action-plan-recurrence-panel';
import { RecurrenceFrequency } from '../../../../../features/action-plans/models/action-plan.model';
import { MUNICIPIOS_VALLE } from '../../../../../core/data/municipios';
import { UserResponse } from '../../../../../features/user/models/user.model';

export interface SupportStaffEntry {
  name: string;
  user_id: number | null;
}

export interface ActivityFormData {
  name: string;
  deliverable: string;
  delivery_date: string;
  lugar: string | null;
  requires_boss_assistance: boolean;
  generates_report: boolean;
  support_staff: SupportStaffEntry[];
  recurrence: RecurrenceForm;
}

@Component({
  selector: 'app-action-plan-activity-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionPlanRecurrencePanelComponent],
  templateUrl: './action-plan-activity-form.html',
})
export class ActionPlanActivityFormComponent {

  municipios = MUNICIPIOS_VALLE;

  @Input() activity!: ActivityFormData;
  @Input() index = 0;
  @Input() namePrefix = '';
  @Input() canRemove = false;
  @Input() showRecurrence = true;
  @Input() isEditMode = false;
  @Input() showNameError = false;
  /** Lista de usuarios disponibles para seleccionar como personal de apoyo */
  @Input() availableUsers: UserResponse[] = [];

  @Output() remove = new EventEmitter<void>();
  @Output() addStaff = new EventEmitter<void>();
  @Output() removeStaff = new EventEmitter<number>();

  onSupportStaffUserChange(staff: SupportStaffEntry): void {
    if (staff.user_id) {
      const u = this.availableUsers.find(x => x.id === staff.user_id);
      if (u) staff.name = `${u.first_name} ${u.last_name}`.trim();
    }
  }
}
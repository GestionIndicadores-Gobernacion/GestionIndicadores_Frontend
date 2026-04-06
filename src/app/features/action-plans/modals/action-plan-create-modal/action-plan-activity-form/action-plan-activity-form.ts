import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionPlanRecurrencePanelComponent, RecurrenceForm } from '../action-plan-recurrence-panel/action-plan-recurrence-panel';
import { RecurrenceFrequency } from '../../../../../core/models/action-plan.model';
import { MUNICIPIOS_VALLE } from '../../../../../core/data/municipios';

export interface ActivityFormData {
  name: string;
  deliverable: string;
  delivery_date: string;
  lugar: string | null;
  requires_boss_assistance: boolean;
  support_staff: { name: string }[];
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
  @Input() index = 0;           // número de actividad (para mostrar)
  @Input() namePrefix = '';     // prefijo para names únicos
  @Input() canRemove = false;
  @Input() showRecurrence = true;  // en edición puede desactivarse
  @Input() isEditMode = false;     // true = modal de edición

  @Input() showNameError = false;  // ← AGREGA
  @Output() remove = new EventEmitter<void>();
  @Output() addStaff = new EventEmitter<void>();
  @Output() removeStaff = new EventEmitter<number>();
}
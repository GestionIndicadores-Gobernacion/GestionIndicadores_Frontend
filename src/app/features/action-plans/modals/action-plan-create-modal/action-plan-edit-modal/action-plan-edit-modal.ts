import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ActionPlanModel, ActionPlanObjectiveModel, ActionPlanActivityModel, RecurrenceFrequency, ActionPlanActivityEditRequest } from '../../../../../core/models/action-plan.model';
import { ActionPlanService } from '../../../../../core/services/action-plan.service';
import { ActionPlanActivityFormComponent, ActivityFormData } from '../action-plan-activity-form/action-plan-activity-form';

@Component({
  selector: 'app-action-plan-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionPlanActivityFormComponent],
  templateUrl: './action-plan-edit-modal.html',
})
export class ActionPlanEditModalComponent implements OnInit {

  @Input() plan!: ActionPlanModel;
  @Input() objective!: ActionPlanObjectiveModel;
  @Input() activity!: ActionPlanActivityModel;

  @Output() close = new EventEmitter<void>();
  @Output() edited = new EventEmitter<void>();

  form!: ActivityFormData;
  saving = false;
  error = '';

  get isRecurrent(): boolean {
    return !!this.activity.recurrence_group_id;
  }

  constructor(
    private actionPlanService: ActionPlanService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.form = {
      name: this.activity.name,
      deliverable: this.activity.deliverable,
      delivery_date: this.activity.delivery_date,
      lugar: this.activity.lugar ?? null,
      requires_boss_assistance: this.activity.requires_boss_assistance ?? false,
      generates_report: this.activity.generates_report ?? false,
      support_staff: (this.activity.support_staff ?? []).map(s => ({ name: s.name })),
      recurrence: {
        enabled: false,
        frequency: (this.activity.recurrence_rule?.frequency ?? 'monthly') as RecurrenceFrequency,
        until: this.activity.recurrence_rule?.until ?? '',
        day_of_month: this.activity.recurrence_rule?.day_of_month ?? null,
        day_of_week: this.activity.recurrence_rule?.day_of_week ?? null,
        interval: this.activity.recurrence_rule?.interval ?? 7,
      },
    };
  }

  addStaff(): void { this.form.support_staff.push({ name: '' }); }
  removeStaff(i: number): void { this.form.support_staff.splice(i, 1); }

  submit(editAll: boolean): void {
    this.error = '';
    if (!this.form.name.trim()) { this.error = 'El nombre es requerido.'; return; }
    if (!this.form.deliverable.trim()) { this.error = 'El entregable es requerido.'; return; }
    if (!this.form.delivery_date) { this.error = 'La fecha de entrega es requerida.'; return; }

    const payload: ActionPlanActivityEditRequest = {
      name: this.form.name.trim(),
      deliverable: this.form.deliverable.trim(),
      delivery_date: editAll ? undefined : this.form.delivery_date,
      lugar: this.form.lugar,
      requires_boss_assistance: this.form.requires_boss_assistance,
      generates_report: this.form.generates_report,
      support_staff: this.form.support_staff.filter(s => s.name.trim()),
      edit_all: editAll,
    };

    this.saving = true;
    this.actionPlanService.editActivity(this.activity.id!, payload).subscribe({
      next: () => { this.saving = false; this.edited.emit(); },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.errors?.activity ?? 'Error al guardar.';
        this.cdr.detectChanges();
      }
    });
  }

  onClose(): void { this.close.emit(); }
}
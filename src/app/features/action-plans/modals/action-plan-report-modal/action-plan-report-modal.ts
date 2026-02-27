import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel
} from '../../../../core/models/action-plan.model';
import { ActionPlanService } from '../../../../core/services/action-plan.service';

@Component({
  selector: 'app-action-plan-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './action-plan-report-modal.html',
  styleUrl: './action-plan-report-modal.css',
})
export class ActionPlanReportModalComponent {

  @Input() plan!:      ActionPlanModel;
  @Input() objective!: ActionPlanObjectiveModel;  // ← nuevo
  @Input() activity!:  ActionPlanActivityModel;

  @Output() close    = new EventEmitter<void>();
  @Output() reported = new EventEmitter<void>();

  evidenceUrl = '';
  description = '';
  saving      = false;
  error       = '';

  constructor(private actionPlanService: ActionPlanService) { }

  get isReadOnly(): boolean {
    return this.activity.status === 'Realizado';
  }

  get isLate(): boolean {
    const today    = new Date();
    const delivery = new Date(this.activity.delivery_date + 'T00:00:00');
    return today > delivery;
  }

  get expectedScore(): number {
    return this.isLate ? 1 : 5;
  }

  get objectiveLabel(): string {
    if (!this.objective) return '';
    return this.objective.objective_text ?? 'Objetivo del componente';
  }

  submit(): void {
    this.error = '';

    if (!this.evidenceUrl.trim()) {
      this.error = 'El link de evidencia es requerido.';
      return;
    }
    if (this.evidenceUrl.trim().length < 5) {
      this.error = 'El link de evidencia no es válido.';
      return;
    }

    this.saving = true;

    this.actionPlanService.report(this.activity.id!, {
      evidence_url: this.evidenceUrl.trim(),
      description:  this.description.trim() || null,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.reported.emit();
      },
      error: (err) => {
        const errors = err?.error?.errors;
        if (errors) {
          if (errors.evidence_url)  this.error = errors.evidence_url;
          else if (errors.activity) this.error = errors.activity;
          else if (errors.database) this.error = 'Error interno. Intenta de nuevo.';
          else this.error = Object.values(errors)[0] as string;
        } else {
          this.error = 'Error al reportar la actividad.';
        }
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel
} from '../../../../core/models/action-plan.model';
import { ActionPlanService } from '../../../../core/services/action-plan.service';

@Component({
  selector: 'app-action-plan-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './action-plan-report-modal.html',
  styleUrl: './action-plan-report-modal.css',
})
export class ActionPlanReportModalComponent implements OnInit {

  @Input() plan!: ActionPlanModel;
  @Input() objective!: ActionPlanObjectiveModel;
  @Input() activity!: ActionPlanActivityModel;
  @Input() prefillEvidenceUrl = '';

  @Output() close = new EventEmitter<void>();
  @Output() reported = new EventEmitter<void>();

  evidenceUrl = '';
  description = '';
  saving = false;
  error = '';

  constructor(
    private actionPlanService: ActionPlanService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Prioridad: prefill externo (viene del flujo de retorno) 
    // Fallback: evidencia del reporte vinculado
    if (this.prefillEvidenceUrl) {
      this.evidenceUrl = this.prefillEvidenceUrl;
    } else if (this.activity.linked_report_evidence) {
      this.evidenceUrl = this.activity.linked_report_evidence;
    }
  }

  get isReadOnly(): boolean {
    return this.activity.status === 'Realizado';
  }

  get isLate(): boolean {
    const today = new Date();
    const delivery = new Date(this.activity.delivery_date + 'T00:00:00');
    return today > delivery;
  }

  get expectedScore(): number {
    // Si ya está realizada, usar el score calculado
    if (this.isReadOnly) {
      return this.activity.computed_score ?? 5;
    }

    // Proyectar qué puntaje tendrá al reportar
    let base = 5;
    if (this.activity.generates_report && this.activity.linked_report_id) {
      base += 2; // ya tiene reporte → 7
    }
    return base;
    // Nota: -1 solo aplica cuando NO se reporta, no es un estado al que llega
    // el usuario desde este modal (aquí siempre va a reportar)
  }

  get objectiveLabel(): string {
    if (!this.objective) return '';
    return this.objective.objective_text ?? 'Objetivo del componente';
  }

  /** True si la actividad tiene un reporte creado desde el módulo de reportes */
  get hasLinkedReport(): boolean {
    return !!this.activity.linked_report_id;
  }

  goToCreateReport(): void {
    this.close.emit();
    this.router.navigate(['/reports', 'new'], {
      queryParams: { activityId: this.activity.id }
    });
  }

  goToLinkedReport(): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/reports', this.activity.linked_report_id])
    );

    window.open(url, '_blank');
    this.close.emit();
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
      description: this.description.trim() || null,
    }).subscribe({
      next: () => { this.saving = false; this.reported.emit(); },
      error: (err) => {
        this.saving = false;
        const errors = err?.error?.errors;
        if (errors) {
          if (errors.evidence_url) this.error = errors.evidence_url;
          else if (errors.activity) this.error = errors.activity;
          else if (errors.database) this.error = 'Error interno. Intenta de nuevo.';
          else this.error = Object.values(errors)[0] as string;
        } else {
          this.error = 'Error al reportar la actividad.';
        }
      }
    });
  }

  onClose(): void { this.close.emit(); }
}
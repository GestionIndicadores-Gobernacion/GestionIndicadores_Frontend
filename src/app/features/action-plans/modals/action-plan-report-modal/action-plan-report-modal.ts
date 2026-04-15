import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel
} from '../../../../features/action-plans/models/action-plan.model';
import { ActionPlanService } from '../../../../features/action-plans/services/action-plan.service';

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
  /** ID del usuario actual para validar permisos de evidencia */
  @Input() currentUserId?: number | null;

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
    } else if (this.activity.evidence_url) {
      this.evidenceUrl = this.activity.evidence_url;
    }
  }

  /** Actividad completamente finalizada con evidencia */
  get isReadOnly(): boolean {
    return this.activity.status === 'Realizado';
  }

  /** Actividad reportada pero sin evidencia aún */
  get isPendingEvidence(): boolean {
    return this.activity.status === 'Pendiente de Evidencia';
  }

  /** Días desde la fecha de entrega */
  get daysSinceDelivery(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(this.activity.delivery_date + 'T00:00:00');
    return Math.floor((today.getTime() - delivery.getTime()) / (1000 * 60 * 60 * 24));
  }

  /** Días restantes para agregar evidencia (ventana de 8 días desde entrega) */
  get evidenceDaysRemaining(): number {
    return 8 - this.daysSinceDelivery;
  }

  /** True si aún está dentro de la ventana de 8 días para agregar evidencia */
  get withinEvidenceWindow(): boolean {
    return this.evidenceDaysRemaining > 0;
  }

  get isLate(): boolean {
    const today = new Date();
    const delivery = new Date(this.activity.delivery_date + 'T00:00:00');
    return today > delivery;
  }

  get expectedScore(): number {
    if (this.isReadOnly) {
      return this.activity.computed_score ?? 5;
    }
    let base = 5;
    if (this.activity.generates_report && this.activity.linked_report_id) {
      base += 2;
    }
    return base;
  }

  get objectiveLabel(): string {
    if (!this.objective) return '';
    return this.objective.objective_text ?? 'Objetivo del componente';
  }

  /** True si la actividad tiene un reporte creado desde el módulo de reportes */
  get hasLinkedReport(): boolean {
    return !!this.activity.linked_report_id;
  }

  /** True si el usuario actual puede agregar/editar evidencia */
  get canManageEvidence(): boolean {
    if (!this.currentUserId) return true; // sin info, asumir que puede
    const responsibleIds: number[] = this.plan.responsible_user_ids ?? [];
    if (this.plan.responsible_user_id) {
      responsibleIds.push(this.plan.responsible_user_id);
    }
    return responsibleIds.includes(this.currentUserId);
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

  /** Envía el reporte inicial (evidencia opcional) */
  submit(): void {
    this.error = '';

    const evidence = this.evidenceUrl.trim();
    if (evidence && evidence.length < 5) {
      this.error = 'El link de evidencia no es válido.';
      return;
    }

    this.saving = true;

    this.actionPlanService.report(this.activity.id!, {
      evidence_url: evidence || null,
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

  /** Agrega o edita la evidencia de una actividad ya reportada */
  submitEvidence(): void {
    this.error = '';

    const evidence = this.evidenceUrl.trim();
    if (!evidence) {
      this.error = 'El link de evidencia es requerido.';
      return;
    }
    if (evidence.length < 5) {
      this.error = 'El link de evidencia no es válido.';
      return;
    }

    this.saving = true;

    this.actionPlanService.addEvidence(this.activity.id!, {
      evidence_url: evidence,
    }).subscribe({
      next: () => { this.saving = false; this.reported.emit(); },
      error: (err) => {
        this.saving = false;
        const backendError = err?.error?.error;
        const errors = err?.error?.errors;
        if (backendError) {
          this.error = backendError;
        } else if (errors) {
          if (errors.evidence_url) this.error = errors.evidence_url;
          else if (errors.activity) this.error = errors.activity;
          else if (errors.database) this.error = 'Error interno. Intenta de nuevo.';
          else this.error = Object.values(errors)[0] as string;
        } else {
          this.error = 'Error al guardar la evidencia.';
        }
      }
    });
  }

  onClose(): void { this.close.emit(); }
}
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  ActionPlanActivityAdminEditRequest,
  ActionPlanActivityChangeModel,
  ActionPlanActivityModel,
  ActionPlanModel,
  ActionPlanObjectiveModel
} from '../../../../features/action-plans/models/action-plan.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ActionPlanService } from '../../../../features/action-plans/services/action-plan.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { PERMS } from '../../../../core/constants/permissions';

@Component({
  selector: 'app-action-plan-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
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
  /**
   * El padre lo calcula: rol admin + permiso `ACTION_PLANS_EDIT_REPORTED`.
   * Solo oculta/muestra la acción; el backend vuelve a validar ambas cosas.
   */
  @Input() canAdminEdit = false;

  @Output() close = new EventEmitter<void>();
  @Output() reported = new EventEmitter<void>();
  /** Emitido tras una corrección administrativa exitosa (con avisos del backend). */
  @Output() corrected = new EventEmitter<string[]>();

  evidenceUrl = '';
  description = '';
  saving = false;
  error = '';

  // ── Corrección administrativa (actividad ya reportada) ─────────────
  adminEditMode = false;
  adminForm = { name: '', deliverable: '', lugar: '', delivery_date: '', reason: '' };
  adminErrors: Record<string, string> = {};

  // ── Historial de correcciones ─────────────────────────────────────
  showHistory = false;
  historyLoading = false;
  history: ActionPlanActivityChangeModel[] = [];

  readonly FIELD_LABELS: Record<string, string> = {
    name: 'Nombre',
    deliverable: 'Entregable',
    delivery_date: 'Fecha de entrega',
    lugar: 'Lugar',
  };

  private destroyRef = inject(DestroyRef);

  constructor(
    private actionPlanService: ActionPlanService,
    private router: Router,
    private permissionService: PermissionService,
    private toast: ToastService,
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

  /**
   * True si el usuario actual puede agregar/editar evidencia.
   *
   * Regla: es responsable del plan O tiene el permiso explícito
   * `ACTION_PLANS_ADD_EVIDENCE` (override granular administrable desde la
   * UI). Sin el permiso, ni admin puede — el override ya no es por rol.
   */
  get canManageEvidence(): boolean {
    if (!this.currentUserId) return true; // sin info, asumir que puede
    const responsibleIds: number[] = this.plan.responsible_user_ids ?? [];
    if (this.plan.responsible_user_id) {
      responsibleIds.push(this.plan.responsible_user_id);
    }
    if (responsibleIds.includes(this.currentUserId)) return true;
    return this.permissionService.hasPermission(PERMS.ACTION_PLANS_ADD_EVIDENCE);
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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  // ── Corrección administrativa ─────────────────────────────────────

  /** La actividad ya tiene reporte (Realizado o Pendiente de Evidencia). */
  get isReported(): boolean {
    return !!this.activity.reported_at;
  }

  /** Fecha máxima permitida: el día en que se reportó (espeja backend). */
  get maxCorrectionDate(): string {
    return (this.activity.reported_at ?? '').slice(0, 10);
  }

  /** Mismo año que la fecha actual (espeja backend). */
  get minCorrectionDate(): string {
    return `${this.activity.delivery_date.slice(0, 4)}-01-01`;
  }

  openAdminEdit(): void {
    if (!this.canAdminEdit || !this.isReported) return;
    this.adminForm = {
      name: this.activity.name ?? '',
      deliverable: this.activity.deliverable ?? '',
      lugar: this.activity.lugar ?? '',
      delivery_date: this.activity.delivery_date,
      reason: '',
    };
    this.adminErrors = {};
    this.error = '';
    this.adminEditMode = true;
  }

  cancelAdminEdit(): void {
    if (this.saving) return;
    this.adminEditMode = false;
    this.adminErrors = {};
  }

  /** Solo los campos que realmente cambian (el backend rechaza "sin cambios"). */
  buildAdminPayload(): ActionPlanActivityAdminEditRequest {
    const f = this.adminForm;
    const body: ActionPlanActivityAdminEditRequest = { reason: f.reason.trim() };
    if (f.name.trim() !== (this.activity.name ?? '')) body.name = f.name.trim();
    if (f.deliverable.trim() !== (this.activity.deliverable ?? '')) body.deliverable = f.deliverable.trim();
    if ((f.lugar.trim() || null) !== (this.activity.lugar || null)) body.lugar = f.lugar.trim() || null;
    if (f.delivery_date && f.delivery_date !== this.activity.delivery_date) body.delivery_date = f.delivery_date;
    return body;
  }

  private changedFieldLabels(body: ActionPlanActivityAdminEditRequest): string[] {
    return (['name', 'deliverable', 'lugar', 'delivery_date'] as const)
      .filter(k => k in body)
      .map(k => this.FIELD_LABELS[k]);
  }

  submitAdminEdit(): void {
    this.adminErrors = {};
    const f = this.adminForm;
    if (!f.name.trim()) this.adminErrors['name'] = 'El nombre es obligatorio.';
    if (!f.deliverable.trim()) this.adminErrors['deliverable'] = 'El entregable es obligatorio.';
    if (!f.delivery_date) this.adminErrors['delivery_date'] = 'La fecha es obligatoria.';
    else if (f.delivery_date > this.maxCorrectionDate)
      this.adminErrors['delivery_date'] = `No puede ser posterior a la fecha de reporte (${this.maxCorrectionDate}).`;
    else if (f.delivery_date.slice(0, 4) !== this.activity.delivery_date.slice(0, 4))
      this.adminErrors['delivery_date'] = 'Debe permanecer en el mismo año.';
    if (f.reason.trim().length < 10) this.adminErrors['reason'] = 'Indica el motivo (mínimo 10 caracteres).';
    if (Object.keys(this.adminErrors).length) return;

    const body = this.buildAdminPayload();
    const labels = this.changedFieldLabels(body);
    if (!labels.length) {
      this.adminErrors['general'] = 'No hay cambios para guardar.';
      return;
    }

    this.toast.confirm(
      '¿Confirmar corrección?',
      `Se modificará: ${labels.join(', ')}. El reporte vinculado y sus indicadores no cambian. ` +
      'El cambio quedará registrado en el historial con tu usuario y el motivo.',
      'Sí, guardar corrección',
    ).then(result => {
      if (!result.isConfirmed) return;
      this.saving = true;
      this.actionPlanService.adminEditActivity(this.activity.id!, body)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.saving = false;
            this.adminEditMode = false;
            this.corrected.emit(res?.warnings ?? []);
          },
          error: err => {
            this.saving = false;
            const backendError = err?.error?.error;
            const errors = err?.error?.errors;
            if (backendError) {
              this.adminErrors['general'] = backendError;
            } else if (errors) {
              // 422 de marshmallow: { json: { campo: [msg] } }; validador: { campo: msg }
              const flat = errors.json ?? errors;
              for (const [k, v] of Object.entries(flat)) {
                const msg = Array.isArray(v) ? v.join(' ') : String(v);
                if (k in this.adminForm) this.adminErrors[k] = msg;
                else this.adminErrors['general'] = msg;
              }
            } else {
              this.adminErrors['general'] = 'Error al guardar la corrección.';
            }
          },
        });
    });
  }

  // ── Historial ─────────────────────────────────────────────────────

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (!this.showHistory || this.history.length || this.historyLoading) return;
    this.historyLoading = true;
    this.actionPlanService.getActivityChanges(this.activity.id!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => { this.history = rows ?? []; this.historyLoading = false; },
        error: () => { this.history = []; this.historyLoading = false; },
      });
  }

  fieldLabel(field: string): string {
    return this.FIELD_LABELS[field] ?? field;
  }

  onClose(): void { this.close.emit(); }
}
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicPolicyModel } from '../../../../../features/report/models/component.model';
import { PublicPoliciesService } from '../../../../../features/report/services/public-policies.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-public-policy-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './public-policy-modal.html',
  styleUrl: './public-policy-modal.css',
})
export class PublicPolicyModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  policies: PublicPolicyModel[] = [];
  loading = false;
  search = '';

  editingPolicy: PublicPolicyModel | null = null;
  editCode = '';
  editDescription = '';
  editSaving = false;

  newCode = '';
  newDescription = '';
  newSaving = false;
  showNewForm = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private service: PublicPoliciesService,
    private toast: ToastService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPolicies();
  }

  close(): void {
    this.closed.emit();
  }

  loadPolicies(): void {
    this.loading = true;
    this.cd.detectChanges();
    this.service.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { this.policies = p ?? []; this.loading = false; this.cd.detectChanges(); },
      error: () => { this.toast.error('Error cargando políticas'); this.loading = false; this.cd.detectChanges(); }
    });
  }

  get filteredPolicies(): PublicPolicyModel[] {
    const term = this.search.toLowerCase().trim();
    if (!term) return this.policies;
    return this.policies.filter(p =>
      p.code.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
    );
  }

  // ── Nuevo ────────────────────────────────────────────────────
  toggleNewForm(): void {
    this.showNewForm = !this.showNewForm;
    this.newCode = '';
    this.newDescription = '';
    this.editingPolicy = null;
    this.cd.detectChanges();
  }

  saveNew(): void {
    if (!this.newCode.trim() || !this.newDescription.trim()) return;
    this.newSaving = true;
    this.cd.detectChanges();
    this.service.create({ code: this.newCode.trim(), description: this.newDescription.trim() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Política creada');
        this.newCode = ''; this.newDescription = '';
        this.showNewForm = false; this.newSaving = false;
        this.loadPolicies();
      },
      error: err => {
        this.toast.error(err.error?.errors?.code || 'Error al crear');
        this.newSaving = false; this.cd.detectChanges();
      }
    });
  }

  // ── Editar ───────────────────────────────────────────────────
  startEdit(policy: PublicPolicyModel): void {
    this.editingPolicy = policy;
    this.editCode = policy.code;
    this.editDescription = policy.description;
    this.showNewForm = false;
    this.cd.detectChanges();
  }

  cancelEdit(): void {
    this.editingPolicy = null;
    this.cd.detectChanges();
  }

  saveEdit(): void {
    if (!this.editingPolicy || !this.editCode.trim() || !this.editDescription.trim()) return;
    this.editSaving = true;
    this.cd.detectChanges();
    this.service.update(this.editingPolicy.id, { code: this.editCode.trim(), description: this.editDescription.trim() }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Política actualizada');
        this.editingPolicy = null; this.editSaving = false;
        this.loadPolicies();
      },
      error: err => {
        this.toast.error(err.error?.errors?.code || 'Error al actualizar');
        this.editSaving = false; this.cd.detectChanges();
      }
    });
  }

  // ── Eliminar ─────────────────────────────────────────────────
  deletePolicy(policy: PublicPolicyModel): void {
    this.toast.confirm(`¿Eliminar política ${policy.code}?`, 'Esta acción no se puede deshacer.').then(result => {
      if (!result.isConfirmed) return;
      this.service.delete(policy.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.toast.success('Política eliminada'); this.loadPolicies(); },
        error: err => { this.toast.error(err.error?.message || 'Error al eliminar'); this.cd.detectChanges(); }
      });
    });
  }
}

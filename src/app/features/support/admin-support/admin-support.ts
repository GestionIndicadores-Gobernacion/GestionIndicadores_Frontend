// features/support/admin-support/admin-support.ts
import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, finalize } from 'rxjs';

import {
  TicketDetail,
  TicketStatus,
  TicketSummary,
} from '../../../core/services/support.service';
import { SupportChatBase } from '../../../shared/components/support-chat/support-chat-base';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-support.html',
  styleUrl: './admin-support.css',
})
export class AdminSupportComponent extends SupportChatBase
  implements OnInit, OnDestroy, AfterViewChecked {

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // ───── Estado de la lista ─────
  tickets: TicketSummary[] = [];
  isLoading = false;
  statusFilter: TicketStatus | '' = '';
  adminUnread = 0;
  private adminUnreadSub: Subscription | null = null;

  // ───── Detalle / Chat ─────
  selected: TicketDetail | null = null;
  isLoadingDetail = false;
  isUpdatingStatus = false;

  readonly statusOptions: { value: TicketStatus; label: string }[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'resuelto', label: 'Resuelto' },
    { value: 'cerrado', label: 'Cerrado' },
  ];

  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('replyFileInput') replyFileInput?: ElementRef<HTMLInputElement>;

  // ───── Enlaces para la lógica compartida (SupportChatBase) ─────
  protected get chatTicket(): TicketDetail | null { return this.selected; }
  protected set chatTicket(t: TicketDetail | null) { this.selected = t; }
  protected get chatVariantIsAdmin(): boolean { return true; }
  protected get chatScrollEl() { return this.chatScroll; }
  protected get replyFileInputEl() { return this.replyFileInput; }
  protected override onChatTicketSynced(t: TicketDetail): void {
    this.updateLocalTicketStatus(t.id, t.status);
    this.updateLocalUnread(t.id);
    this.support.fetchAdminUnreadCount();
  }

  ngOnInit(): void {
    this.refreshList();
    this.adminUnreadSub = this.support.adminUnreadCount.subscribe(n => {
      this.adminUnread = n;
      this.cdr.markForCheck();
    });
    this.support.fetchAdminUnreadCount();
    const initialId = this.route.snapshot.queryParamMap.get('ticketId');
    if (initialId) this.openTicket(+initialId);
  }

  ngOnDestroy(): void {
    this.stopChatPolling();
    this.adminUnreadSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    this.maybeScrollChat();
  }

  // ───── Lista ─────
  refreshList(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.support.listTickets(this.statusFilter || null).subscribe({
      next: (list) => {
        this.tickets = list;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('No se pudieron cargar los tickets.');
      },
    });
  }

  applyFilter(s: TicketStatus | ''): void {
    this.statusFilter = s;
    this.refreshList();
  }

  // ───── Detalle ─────
  openTicket(id: number): void {
    this.stopChatPolling();
    this.selected = null;
    this.isLoadingDetail = true;
    this.cdr.markForCheck();
    this.support.getTicket(id).subscribe({
      next: (t) => {
        this.selected = t;
        this.isLoadingDetail = false;
        this.shouldScrollChat = true;
        this.startChatPolling();
        // Abrir marca leído en backend (mensajes de usuario + notificaciones);
        // sincroniza el badge de soporte y la campana del admin.
        this.support.refreshUnread();
        this.support.fetchAdminUnreadCount();
        this.notif.fetchCount();
        this.updateLocalUnread(t.id);
        this.cdr.markForCheck();
        // Mantener URL sincronizada para deep-linking desde notificaciones.
        this.router.navigate([], {
          queryParams: { ticketId: t.id },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      error: () => {
        this.isLoadingDetail = false;
        this.toast.error('No se pudo abrir el ticket.');
      },
    });
  }

  closeDetail(): void {
    this.stopChatPolling();
    this.selected = null;
    this.clearReplyImages();
    this.replyBody = '';
    this.router.navigate([], {
      queryParams: { ticketId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  changeStatus(newStatus: TicketStatus): void {
    if (!this.selected || this.isUpdatingStatus) return;
    if (this.selected.status === newStatus) return;

    this.isUpdatingStatus = true;
    this.support.updateStatus(this.selected.id, newStatus).pipe(
      finalize(() => this.zone.run(() => {
        this.isUpdatingStatus = false;
        this.cdr.markForCheck();
      })),
    ).subscribe({
      next: (t) => {
        this.selected = t;
        this.updateLocalTicketStatus(t.id, t.status);
        this.toast.success(`Estado actualizado a "${this.statusLabel(t.status)}".`);
      },
      error: (err) => {
        this.toast.error(err?.error?.error || 'No se pudo cambiar el estado.');
      },
    });
  }

  private updateLocalTicketStatus(id: number, status: TicketStatus): void {
    const idx = this.tickets.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.tickets[idx] = { ...this.tickets[idx], status };
    }
  }

  /** Pone a cero el contador de mensajes de usuario sin leer en la lista. */
  private updateLocalUnread(id: number): void {
    const idx = this.tickets.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.tickets[idx] = { ...this.tickets[idx], unread_user_messages: 0 };
    }
  }
}

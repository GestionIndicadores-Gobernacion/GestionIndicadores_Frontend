// shared/components/support-button/support-button.ts
import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import { SupportPanelService } from '../../../core/services/support-panel.service';
import {
  TicketDetail,
  TicketSummary,
} from '../../../core/services/support.service';
import { SupportChatBase } from '../support-chat/support-chat-base';

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 4000;
const MIN_MESSAGE_LENGTH = 10;

type View = 'tabs' | 'chat';
type Tab = 'new' | 'mine';

@Component({
  selector: 'app-support-button',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './support-button.html',
  styleUrl: './support-button.css',
})
export class SupportButtonComponent extends SupportChatBase
  implements OnInit, OnDestroy, AfterViewChecked {

  private router = inject(Router);
  private panel = inject(SupportPanelService);
  // `auth` viene de SupportChatBase (protected).

  private openTicketSub: Subscription | null = null;

  // ───── Estado del panel ─────
  isOpen = false;
  view: View = 'tabs';
  tab: Tab = 'new';

  // ───── Formulario "Nuevo reporte" ─────
  message = '';
  screenshotDataUrl: string | null = null;
  screenshotName: string | null = null;
  screenshotError: string | null = null;
  isSending = false;

  readonly maxLen = MAX_MESSAGE_LENGTH;
  readonly minLen = MIN_MESSAGE_LENGTH;

  // ───── Lista "Mis reportes" ─────
  tickets: TicketSummary[] = [];
  isLoadingTickets = false;

  // ───── Chat ─────
  activeTicket: TicketDetail | null = null;
  isLoadingTicket = false;

  // ───── Badge ─────
  // Para admins el número rojo también incluye los tickets sin atender
  // (mensajes nuevos de usuarios), no solo las respuestas a reportes propios.
  readonly isAdminUser = this.auth.hasRole(3);
  private ownerUnread = 0;
  private adminUnread = 0;
  get unreadCount(): number {
    return this.ownerUnread + (this.isAdminUser ? this.adminUnread : 0);
  }
  private unreadSub: Subscription | null = null;
  private adminUnreadSub: Subscription | null = null;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('replyFileInput') replyFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;

  // ───── Enlaces para la lógica compartida (SupportChatBase) ─────
  protected get chatTicket(): TicketDetail | null { return this.activeTicket; }
  protected set chatTicket(t: TicketDetail | null) { this.activeTicket = t; }
  protected get chatVariantIsAdmin(): boolean { return false; }
  protected get chatScrollEl() { return this.chatScroll; }
  protected get replyFileInputEl() { return this.replyFileInput; }
  protected override onChatTicketSynced(t: TicketDetail): void {
    const idx = this.tickets.findIndex(x => x.id === t.id);
    if (idx >= 0) {
      this.tickets[idx] = { ...this.tickets[idx], status: t.status };
    }
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.support.startPolling(this.isAdminUser);
    }
    this.unreadSub = this.support.unreadCount.subscribe(n => {
      this.ownerUnread = n;
      this.cdr.markForCheck();
    });
    this.adminUnreadSub = this.support.adminUnreadCount.subscribe(n => {
      this.adminUnread = n;
      this.cdr.markForCheck();
    });
    this.openTicketSub = this.panel.openTicket$.subscribe(id => {
      this.openTicketById(id);
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.adminUnreadSub?.unsubscribe();
    this.openTicketSub?.unsubscribe();
    this.stopChatPolling();
  }

  ngAfterViewChecked(): void {
    this.maybeScrollChat();
  }

  // ─────────────────────────────────────────────────────────────
  // FAB
  // ─────────────────────────────────────────────────────────────
  toggle(): void {
    // Admin con tickets sin atender: el número rojo lleva directo al panel de
    // soporte, que es donde están esos mensajes nuevos (no en "Mis reportes").
    if (this.isAdminUser && !this.isOpen && this.adminUnread > 0) {
      this.router.navigate(['/support']);
      return;
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.view = 'tabs';
      // Si hay respuestas no leídas, abrimos directo en "Mis reportes".
      this.tab = this.unreadCount > 0 ? 'mine' : 'new';
      this.loadTicketsIfNeeded();
    } else {
      this.exitChat();
    }
  }

  close(): void {
    if (this.isSending) return;
    this.isOpen = false;
    this.exitChat();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.lightboxImage) {
      this.closeLightbox();
      return;
    }
    if (this.isOpen) {
      if (this.view === 'chat') this.exitChat();
      else this.close();
    }
  }

  switchTab(tab: Tab): void {
    this.tab = tab;
    if (tab === 'mine') this.loadTicketsIfNeeded();
  }

  // ─────────────────────────────────────────────────────────────
  // Formulario "Nuevo reporte"
  // ─────────────────────────────────────────────────────────────
  get charCount(): number {
    return this.message.trim().length;
  }

  get canSubmit(): boolean {
    return !this.isSending && this.charCount >= this.minLen && this.charCount <= this.maxLen;
  }

  onFileSelected(event: Event): void {
    this.screenshotError = null;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.screenshotError = 'El archivo debe ser una imagen.';
      input.value = '';
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      this.screenshotError = 'La imagen supera 4 MB.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.zone.run(() => {
        this.screenshotDataUrl = reader.result as string;
        this.screenshotName = file.name;
        this.cdr.markForCheck();
      });
    };
    reader.onerror = () => {
      this.zone.run(() => {
        this.screenshotError = 'No se pudo leer la imagen.';
        this.cdr.markForCheck();
      });
    };
    reader.readAsDataURL(file);
  }

  removeScreenshot(): void {
    this.screenshotDataUrl = null;
    this.screenshotName = null;
    this.screenshotError = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  submit(): void {
    if (!this.canSubmit) return;

    this.isSending = true;
    this.cdr.markForCheck();

    this.support.createTicket({
      message: this.message.trim(),
      current_url: this.buildCurrentUrl(),
      user_agent: navigator.userAgent || '',
      screenshot_data_url: this.screenshotDataUrl,
    }).pipe(
      finalize(() => this.zone.run(() => {
        this.isSending = false;
        this.cdr.markForCheck();
      })),
    ).subscribe({
      next: (ticket) => {
        this.resetNewForm();
        this.tab = 'mine';
        // Recargamos lista para incluir el ticket recién creado.
        this.tickets = [];
        this.loadTicketsIfNeeded(true);
        setTimeout(() => this.toast.success('Reporte enviado. Te avisaremos cuando haya respuesta.'), 0);
        // Pequeño UX: abrimos directo el chat del ticket creado.
        this.openTicket(ticket.id);
      },
      error: (err) => {
        const msg = err?.error?.error || 'No se pudo enviar el reporte. Inténtalo de nuevo.';
        this.toast.error(msg);
      },
    });
  }

  private resetNewForm(): void {
    this.message = '';
    this.removeScreenshot();
  }

  private buildCurrentUrl(): string {
    try {
      const path = this.router.url || window.location.pathname;
      return `${window.location.origin}${path}`;
    } catch {
      return window.location.href;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Lista "Mis reportes"
  // ─────────────────────────────────────────────────────────────
  loadTicketsIfNeeded(force = false): void {
    if (this.isLoadingTickets) return;
    if (!force && this.tickets.length > 0) return;

    this.isLoadingTickets = true;
    // Sin `mine`: un usuario normal ve solo los suyos; un admin ve todos los
    // tickets (los está gestionando). El badge "N nuevas" se calcula por
    // perspectiva del que mira (unreadForMe), no del dueño.
    this.support.listTickets(null).subscribe({
      next: (list) => {
        this.tickets = list;
        this.isLoadingTickets = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingTickets = false;
        this.toast.error('No se pudieron cargar tus reportes.');
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Chat
  // ─────────────────────────────────────────────────────────────
  openTicket(id: number): void {
    this.view = 'chat';
    this.activeTicket = null;
    this.isLoadingTicket = true;
    this.cdr.markForCheck();

    this.support.getTicket(id).subscribe({
      next: (t) => {
        this.activeTicket = t;
        this.isLoadingTicket = false;
        this.shouldScrollChat = true;
        // El detalle marca como leídas en backend (mensajes + notificaciones);
        // refrescamos AMBOS contadores para que campana y badge queden iguales.
        this.support.refreshUnread();
        this.notif.fetchCount();
        // Refrescar lista para que el unread count se actualice también.
        const idx = this.tickets.findIndex(x => x.id === t.id);
        if (idx >= 0) {
          // Abrir marca leído en backend; ponemos a cero ambos contadores
          // (el badge de la lista usa el que aplique según perspectiva).
          this.tickets[idx] = {
            ...this.tickets[idx],
            unread_admin_replies: 0,
            unread_user_messages: 0,
            status: t.status,
          };
        }
        this.startChatPolling();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingTicket = false;
        this.toast.error('No se pudo cargar el reporte.');
        this.exitChat();
      },
    });
  }

  exitChat(): void {
    this.view = 'tabs';
    this.activeTicket = null;
    this.replyBody = '';
    this.clearReplyImages();
    this.stopChatPolling();
  }

  // Permite abrir un ticket desde fuera (notification-bell, navegación).
  openTicketById(id: number): void {
    if (!this.isOpen) this.isOpen = true;
    this.tab = 'mine';
    this.openTicket(id);
  }
}

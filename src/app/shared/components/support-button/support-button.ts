// shared/components/support-button/support-button.ts
import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { Subscription, finalize, interval, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { SupportPanelService } from '../../../core/services/support-panel.service';
import {
  SupportService,
  TicketDetail,
  TicketStatus,
  TicketSummary,
} from '../../../core/services/support.service';
import { ToastService } from '../../../core/services/toast.service';
import { compressImageFile } from '../../../core/utils/image-compress';

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 4000;
const MIN_MESSAGE_LENGTH = 10;
const CHAT_POLL_MS = 15_000;
const MAX_REPLY_IMAGES = 8;

type View = 'tabs' | 'chat';
type Tab = 'new' | 'mine';

@Component({
  selector: 'app-support-button',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './support-button.html',
  styleUrl: './support-button.css',
})
export class SupportButtonComponent implements OnInit, OnDestroy, AfterViewChecked {

  private support = inject(SupportService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private panel = inject(SupportPanelService);

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
  replyBody = '';
  isReplying = false;
  replyImages: string[] = [];
  replyImageError: string | null = null;
  isProcessingImages = false;
  readonly maxReplyImages = MAX_REPLY_IMAGES;
  private chatPollSub: Subscription | null = null;
  private shouldScrollChat = false;

  // ───── Visor de imagen (lightbox) ─────
  lightboxImage: string | null = null;

  // ───── Badge ─────
  unreadCount = 0;
  private unreadSub: Subscription | null = null;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('replyFileInput') replyFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.support.startPolling();
    }
    this.unreadSub = this.support.unreadCount.subscribe(n => {
      this.unreadCount = n;
      this.cdr.markForCheck();
    });
    this.openTicketSub = this.panel.openTicket$.subscribe(id => {
      this.openTicketById(id);
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.openTicketSub?.unsubscribe();
    this.stopChatPolling();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollChat && this.chatScroll) {
      const el = this.chatScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FAB
  // ─────────────────────────────────────────────────────────────
  toggle(): void {
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
    this.support.listTickets().subscribe({
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

  trackById = (_: number, t: TicketSummary | { id: number }) => t.id;

  statusLabel(s: TicketStatus): string {
    return {
      pendiente: 'Pendiente',
      en_proceso: 'En proceso',
      resuelto: 'Resuelto',
      cerrado: 'Cerrado',
    }[s];
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
        // El detalle marca como leídas en backend; refrescamos badge.
        this.support.refreshUnread();
        // Refrescar lista para que el unread count se actualice también.
        const idx = this.tickets.findIndex(x => x.id === t.id);
        if (idx >= 0) {
          this.tickets[idx] = { ...this.tickets[idx], unread_admin_replies: 0, status: t.status };
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

  get canSendReply(): boolean {
    return !this.isReplying && !this.isProcessingImages
      && (!!this.replyBody.trim() || this.replyImages.length > 0);
  }

  /** Archivos elegidos desde el selector (acepta varios). */
  onReplyFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addImageFiles(input.files);
    input.value = '';
  }

  /** Pegar imagen(es) desde el portapapeles (Ctrl/Cmd+V sobre el textarea). */
  onReplyPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      // Evita que se pegue además la ruta/binario como texto en el textarea.
      event.preventDefault();
      this.addImageFiles(files);
    }
  }

  private addImageFiles(files: FileList | File[] | null): void {
    if (!files) return;
    this.replyImageError = null;
    const list = Array.from(files as ArrayLike<File>);

    for (const file of list) {
      if (this.replyImages.length >= this.maxReplyImages) {
        this.replyImageError = `Máximo ${this.maxReplyImages} imágenes por mensaje.`;
        break;
      }
      if (!file.type.startsWith('image/')) {
        this.replyImageError = 'Solo se pueden adjuntar imágenes.';
        continue;
      }
      if (file.size > MAX_SCREENSHOT_BYTES) {
        this.replyImageError = 'Cada imagen debe pesar menos de 4 MB.';
        continue;
      }

      this.isProcessingImages = true;
      this.cdr.markForCheck();
      compressImageFile(file)
        .then(dataUrl => this.zone.run(() => {
          if (this.replyImages.length < this.maxReplyImages) {
            this.replyImages = [...this.replyImages, dataUrl];
          }
        }))
        .catch(() => this.zone.run(() => {
          this.replyImageError = 'No se pudo procesar una de las imágenes.';
        }))
        .finally(() => this.zone.run(() => {
          this.isProcessingImages = false;
          this.cdr.markForCheck();
        }));
    }
  }

  removeReplyImage(index: number): void {
    this.replyImages = this.replyImages.filter((_, i) => i !== index);
  }

  private clearReplyImages(): void {
    this.replyImages = [];
    this.replyImageError = null;
    if (this.replyFileInput?.nativeElement) {
      this.replyFileInput.nativeElement.value = '';
    }
  }

  openLightbox(src: string | null): void {
    if (src) this.lightboxImage = src;
  }

  closeLightbox(): void {
    this.lightboxImage = null;
  }

  sendReply(): void {
    if (!this.activeTicket || !this.canSendReply) return;
    const body = this.replyBody.trim();
    const images = [...this.replyImages];

    this.isReplying = true;
    this.cdr.markForCheck();

    this.support.addMessage(this.activeTicket.id, body, images).pipe(
      finalize(() => this.zone.run(() => {
        this.isReplying = false;
        this.cdr.markForCheck();
      })),
    ).subscribe({
      next: (msg) => {
        if (this.activeTicket) {
          this.activeTicket = {
            ...this.activeTicket,
            messages: [...this.activeTicket.messages, msg],
          };
        }
        this.replyBody = '';
        this.clearReplyImages();
        this.shouldScrollChat = true;
      },
      error: (err) => {
        const m = err?.error?.error || 'No se pudo enviar la respuesta.';
        this.toast.error(m);
      },
    });
  }

  private startChatPolling(): void {
    this.stopChatPolling();
    this.chatPollSub = interval(CHAT_POLL_MS).pipe(
      switchMap(() => this.activeTicket
        ? this.support.getTicket(this.activeTicket.id)
        : []),
    ).subscribe({
      next: (t) => {
        if (!t || !this.activeTicket || t.id !== this.activeTicket.id) return;
        // Solo actualizamos si hay mensajes nuevos para evitar redibujar.
        if (t.messages.length !== this.activeTicket.messages.length || t.status !== this.activeTicket.status) {
          const wasAtBottom = this.isChatAtBottom();
          this.activeTicket = t;
          if (wasAtBottom) this.shouldScrollChat = true;
          this.cdr.markForCheck();
        }
      },
    });
  }

  private stopChatPolling(): void {
    this.chatPollSub?.unsubscribe();
    this.chatPollSub = null;
  }

  private isChatAtBottom(): boolean {
    if (!this.chatScroll) return true;
    const el = this.chatScroll.nativeElement;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  // Permite abrir un ticket desde fuera (notification-bell, navegación).
  openTicketById(id: number): void {
    if (!this.isOpen) this.isOpen = true;
    this.tab = 'mine';
    this.openTicket(id);
  }
}

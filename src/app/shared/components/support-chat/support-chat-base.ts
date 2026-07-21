// shared/components/support-chat/support-chat-base.ts
//
// Lógica compartida del chat de soporte entre el FAB de usuario
// (support-button) y el panel de administración (admin-support). Cada
// componente conserva su PROPIA plantilla y estilos (son visualmente
// distintos a propósito: panel compacto vs panel ancho); aquí vive solo el
// comportamiento común, que antes estaba duplicado y divergía (intervalos de
// polling distintos, envío no optimista, etc.).
//
// Incluye polling ADAPTATIVO "near-realtime": sondea el endpoint incremental
// cada pocos segundos mientras el chat está abierto y la pestaña visible, y no
// hace nada si la pestaña está oculta o hay un envío en curso.
import { ChangeDetectorRef, ElementRef, NgZone, inject } from '@angular/core';
import { Subscription, finalize, interval, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  SupportService,
  TicketDetail,
  TicketMessage,
  TicketStatus,
  TicketSummary,
} from '../../../core/services/support.service';
import { ToastService } from '../../../core/services/toast.service';
import { compressImageFile } from '../../../core/utils/image-compress';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_REPLY_IMAGES = 8;
// Cadencia del polling: rápido con la pestaña visible (se siente casi en vivo),
// y las peticiones se saltan solas cuando la pestaña está oculta.
const CHAT_POLL_MS = 4_000;

export abstract class SupportChatBase {

  protected support = inject(SupportService);
  protected toast = inject(ToastService);
  protected notif = inject(NotificationService);
  protected zone = inject(NgZone);
  protected cdr = inject(ChangeDetectorRef);
  protected auth = inject(AuthService);

  /** Id del usuario logueado, para decidir qué mensajes son "míos". */
  private readonly myId: number | null = (() => {
    const u = this.auth.getUser();
    if (u?.id != null) return Number(u.id);
    const sub = this.auth.getTokenPayload()?.sub;
    return sub != null ? Number(sub) : null;
  })();

  /**
   * Un mensaje es "mío" si lo escribí YO (por id de autor), no por si es
   * respuesta de admin. Así el color/lado es correcto en todos los casos:
   * usuario, admin, o un admin viendo su propio ticket. Los optimistas
   * (aún sin confirmar) son míos porque acabo de enviarlos.
   */
  isMine(m: TicketMessage): boolean {
    if (m.pending) return true;
    const authorId = m.author?.id;
    if (authorId != null && this.myId != null) return authorId === this.myId;
    // Fallback (autor borrado / sin id): usar el rol de la vista.
    return this.chatVariantIsAdmin ? m.is_admin_reply : !m.is_admin_reply;
  }

  /**
   * "Nuevas" (sin leer) desde MI perspectiva en la lista de reportes:
   * - si el ticket es mío  → respuestas de admin que no he leído.
   * - si es de otro (lo gestiono) → mensajes del usuario que no he leído.
   * Así no me aparece un contador de mensajes que YO mismo envié.
   */
  unreadForMe(t: TicketSummary): number {
    const iOwn = t.author?.id != null && this.myId != null && t.author.id === this.myId;
    return iOwn ? (t.unread_admin_replies || 0) : (t.unread_user_messages || 0);
  }

  // ───── Estado compartido del composer / chat ─────
  replyBody = '';
  isReplying = false;
  replyImages: string[] = [];
  replyImageError: string | null = null;
  isProcessingImages = false;
  readonly maxReplyImages = MAX_REPLY_IMAGES;
  lightboxImage: string | null = null;

  protected shouldScrollChat = false;
  private chatPollSub: Subscription | null = null;

  // ───── Enlaces que aporta cada componente concreto ─────
  /** El ticket activo (activeTicket en el FAB, selected en admin). */
  protected abstract get chatTicket(): TicketDetail | null;
  protected abstract set chatTicket(t: TicketDetail | null);
  /** true en el panel admin: sus mensajes propios son respuestas de admin. */
  protected abstract get chatVariantIsAdmin(): boolean;
  /** Referencias a los elementos de la plantilla concreta. */
  protected abstract get chatScrollEl(): ElementRef<HTMLDivElement> | undefined;
  protected abstract get replyFileInputEl(): ElementRef<HTMLInputElement> | undefined;
  /** Hook para que el padre refleje cambios (estado/no leídos) en su lista. */
  protected onChatTicketSynced(_ticket: TicketDetail): void { /* opcional */ }

  // ───── Helpers de plantilla comunes ─────
  trackById = (_: number, t: { id: number }) => t.id;

  statusLabel(s: TicketStatus): string {
    return {
      pendiente: 'Pendiente',
      en_proceso: 'En proceso',
      resuelto: 'Resuelto',
      cerrado: 'Cerrado',
    }[s];
  }

  get canSendReply(): boolean {
    return !this.isReplying && !this.isProcessingImages
      && (!!this.replyBody.trim() || this.replyImages.length > 0);
  }

  // ───── Adjuntar imágenes (selector + pegar) ─────
  onReplyFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addImageFiles(input.files);
    input.value = '';
  }

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
      if (file.size > MAX_IMAGE_BYTES) {
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

  protected clearReplyImages(): void {
    this.replyImages = [];
    this.replyImageError = null;
    const el = this.replyFileInputEl?.nativeElement;
    if (el) el.value = '';
  }

  // ───── Lightbox ─────
  openLightbox(src: string | null): void {
    if (src) this.lightboxImage = src;
  }

  closeLightbox(): void {
    this.lightboxImage = null;
  }

  // ───── Envío optimista ─────
  sendReply(): void {
    const ticket = this.chatTicket;
    if (!ticket || !this.canSendReply) return;
    const body = this.replyBody.trim();
    const images = [...this.replyImages];
    const ticketId = ticket.id;
    const isAdmin = this.chatVariantIsAdmin;

    // Mensaje optimista con id temporal negativo; se reemplaza al confirmar.
    const tempId = -Date.now();
    const optimistic: TicketMessage = {
      id: tempId, ticket_id: ticketId, body,
      is_admin_reply: isAdmin, read_by_owner: !isAdmin, read_by_admin: isAdmin,
      created_at: new Date().toISOString(), images, author: null, pending: true,
    };
    // Un admin que responde un ticket pendiente lo pasa a en_proceso.
    const newStatus: TicketStatus =
      isAdmin && ticket.status === 'pendiente' ? 'en_proceso' : ticket.status;

    this.chatTicket = { ...ticket, status: newStatus, messages: [...ticket.messages, optimistic] };
    this.onChatTicketSynced(this.chatTicket!);
    this.replyBody = '';
    this.clearReplyImages();
    this.shouldScrollChat = true;
    this.isReplying = true;
    this.cdr.markForCheck();

    this.support.addMessage(ticketId, body, images).pipe(
      finalize(() => this.zone.run(() => {
        this.isReplying = false;
        this.cdr.markForCheck();
      })),
    ).subscribe({
      next: (msg) => {
        const cur = this.chatTicket;
        if (!cur || cur.id !== ticketId) return;
        const rest = cur.messages.filter(m => m.id !== tempId && m.id !== msg.id);
        this.chatTicket = { ...cur, messages: [...rest, msg] };
        this.shouldScrollChat = true;
      },
      error: (err) => {
        const cur = this.chatTicket;
        if (cur && cur.id === ticketId) {
          this.chatTicket = { ...cur, messages: cur.messages.filter(m => m.id !== tempId) };
        }
        this.replyBody = body;
        this.replyImages = images;
        this.toast.error(err?.error?.error || 'No se pudo enviar la respuesta.');
      },
    });
  }

  // ───── Polling incremental adaptativo ─────
  protected startChatPolling(): void {
    this.stopChatPolling();
    this.chatPollSub = interval(CHAT_POLL_MS).pipe(
      switchMap(() => {
        const t = this.chatTicket;
        const hidden = typeof document !== 'undefined' && document.hidden;
        // Sin ticket, enviando o con la pestaña oculta → no molestar al servidor.
        if (!t || this.isReplying || hidden) return [];
        return this.support.getMessagesAfter(t.id, this.lastRealMessageId());
      }),
    ).subscribe({
      next: (res) => {
        const t = this.chatTicket;
        if (!res || !t) return;
        const existing = new Set(t.messages.map(m => m.id));
        const fresh = (res.messages || []).filter(m => !existing.has(m.id));
        if (fresh.length || res.status !== t.status) {
          const wasAtBottom = this.isChatAtBottom();
          this.chatTicket = { ...t, status: res.status, messages: [...t.messages, ...fresh] };
          if (fresh.length && wasAtBottom) this.shouldScrollChat = true;
          this.onChatTicketSynced(this.chatTicket!);
          if (fresh.length) {
            // El backend marcó lo entrante como leído; sincroniza contadores.
            this.support.refreshUnread();
            this.notif.fetchCount();
          }
          this.cdr.markForCheck();
        }
      },
    });
  }

  protected stopChatPolling(): void {
    this.chatPollSub?.unsubscribe();
    this.chatPollSub = null;
  }

  /** Mayor id real (ignora los optimistas con id negativo). */
  protected lastRealMessageId(): number {
    let max = 0;
    for (const m of this.chatTicket?.messages ?? []) {
      if (m.id > max) max = m.id;
    }
    return max;
  }

  protected isChatAtBottom(): boolean {
    const el = this.chatScrollEl?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  /** Llamar desde ngAfterViewChecked del componente concreto. */
  protected maybeScrollChat(): void {
    if (this.shouldScrollChat && this.chatScrollEl) {
      const el = this.chatScrollEl.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
  }
}

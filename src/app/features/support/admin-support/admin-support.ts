// features/support/admin-support/admin-support.ts
import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, finalize, interval, switchMap } from 'rxjs';

import {
  SupportService,
  TicketDetail,
  TicketStatus,
  TicketSummary,
} from '../../../core/services/support.service';
import { ToastService } from '../../../core/services/toast.service';
import { compressImageFile } from '../../../core/utils/image-compress';

const POLL_MS = 20_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_REPLY_IMAGES = 8;

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-support.html',
  styleUrl: './admin-support.css',
})
export class AdminSupportComponent implements OnInit, OnDestroy, AfterViewChecked {

  private support = inject(SupportService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  // ───── Estado de la lista ─────
  tickets: TicketSummary[] = [];
  isLoading = false;
  statusFilter: TicketStatus | '' = '';

  // ───── Detalle / Chat ─────
  selected: TicketDetail | null = null;
  isLoadingDetail = false;
  replyBody = '';
  isReplying = false;
  isUpdatingStatus = false;
  replyImages: string[] = [];
  replyImageError: string | null = null;
  isProcessingImages = false;
  readonly maxReplyImages = MAX_REPLY_IMAGES;
  lightboxImage: string | null = null;
  private chatPollSub: Subscription | null = null;
  private shouldScrollChat = false;

  readonly statusOptions: { value: TicketStatus; label: string }[] = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'resuelto', label: 'Resuelto' },
    { value: 'cerrado', label: 'Cerrado' },
  ];

  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('replyFileInput') replyFileInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.refreshList();
    const initialId = this.route.snapshot.queryParamMap.get('ticketId');
    if (initialId) this.openTicket(+initialId);
  }

  ngOnDestroy(): void {
    this.stopChatPolling();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollChat && this.chatScroll) {
      const el = this.chatScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
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

  trackById = (_: number, t: { id: number }) => t.id;

  statusLabel(s: TicketStatus): string {
    return {
      pendiente: 'Pendiente',
      en_proceso: 'En proceso',
      resuelto: 'Resuelto',
      cerrado: 'Cerrado',
    }[s];
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

  get canSendReply(): boolean {
    return !this.isReplying && !this.isProcessingImages
      && (!!this.replyBody.trim() || this.replyImages.length > 0);
  }

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
    if (!this.selected || !this.canSendReply) return;
    const body = this.replyBody.trim();
    const images = [...this.replyImages];

    this.isReplying = true;
    this.cdr.markForCheck();
    this.support.addMessage(this.selected.id, body, images).pipe(
      finalize(() => this.zone.run(() => {
        this.isReplying = false;
        this.cdr.markForCheck();
      })),
    ).subscribe({
      next: (msg) => {
        if (this.selected) {
          this.selected = {
            ...this.selected,
            // Si el ticket estaba pendiente, el backend lo movió a en_proceso.
            status: this.selected.status === 'pendiente' ? 'en_proceso' : this.selected.status,
            messages: [...this.selected.messages, msg],
          };
          this.replyBody = '';
          this.clearReplyImages();
          this.shouldScrollChat = true;
          this.updateLocalTicketStatus(this.selected.id, this.selected.status);
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.error || 'No se pudo enviar la respuesta.');
      },
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

  private startChatPolling(): void {
    this.stopChatPolling();
    this.chatPollSub = interval(POLL_MS).pipe(
      switchMap(() => this.selected
        ? this.support.getTicket(this.selected.id)
        : []),
    ).subscribe({
      next: (t) => {
        if (!t || !this.selected || t.id !== this.selected.id) return;
        if (t.messages.length !== this.selected.messages.length || t.status !== this.selected.status) {
          const wasAtBottom = this.isChatAtBottom();
          this.selected = t;
          if (wasAtBottom) this.shouldScrollChat = true;
          this.updateLocalTicketStatus(t.id, t.status);
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
}

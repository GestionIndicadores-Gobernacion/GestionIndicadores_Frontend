// core/services/support.service.ts
import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, interval, of, switchMap, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
export type TicketStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

export interface TicketAuthor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  body: string;
  is_admin_reply: boolean;
  read_by_owner: boolean;
  read_by_admin: boolean;
  created_at: string;
  images: string[];
  author: TicketAuthor | null;
  // Solo en cliente: marca un mensaje mostrado de forma optimista antes de
  // confirmarse en el servidor (id temporal negativo).
  pending?: boolean;
}

export interface MessagesDelta {
  status: TicketStatus;
  messages: TicketMessage[];
}

export interface TicketSummary {
  id: number;
  title: string;
  status: TicketStatus;
  current_url: string | null;
  created_at: string;
  updated_at: string;
  author: TicketAuthor | null;
  last_message_preview: string | null;
  unread_admin_replies: number;
  // Mensajes de usuario sin leer por el admin (para el panel de admin).
  unread_user_messages: number;
}

export interface TicketDetail extends TicketSummary {
  user_agent: string | null;
  messages: TicketMessage[];
}

export interface CreateTicketPayload {
  message: string;
  current_url: string;
  user_agent: string;
  screenshot_data_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SupportService implements OnDestroy {

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/support`;

  // Estado reactivo: # de respuestas admin no leídas para badge del FAB.
  private unread$ = new BehaviorSubject<number>(0);
  readonly unreadCount = this.unread$.asObservable();

  // Estado reactivo: # de tickets con mensajes de usuario sin atender (admin).
  private adminUnread$ = new BehaviorSubject<number>(0);
  readonly adminUnreadCount = this.adminUnread$.asObservable();

  private pollSub: Subscription | null = null;
  private pollingEnabled = false;
  private pollAdmin = false;

  // ───── Tickets ─────
  createTicket(payload: CreateTicketPayload): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.api}/tickets`, payload);
  }

  listTickets(status?: TicketStatus | null, mine = false): Observable<TicketSummary[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    // mine=true → solo los tickets propios (vista "Mis reportes" del FAB),
    // aunque el usuario sea admin.
    if (mine) params = params.set('mine', 'true');
    return this.http.get<TicketSummary[]>(`${this.api}/tickets`, { params });
  }

  getTicket(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${this.api}/tickets/${id}`);
  }

  /** Polling incremental: solo los mensajes con id > afterId (evita
   *  re-descargar todo el hilo, imágenes incluidas, en cada sondeo). */
  getMessagesAfter(ticketId: number, afterId: number): Observable<MessagesDelta> {
    const params = new HttpParams().set('after', String(afterId || 0));
    return this.http.get<MessagesDelta>(`${this.api}/tickets/${ticketId}/messages`, { params });
  }

  addMessage(
    ticketId: number,
    body: string,
    images: string[] = [],
  ): Observable<TicketMessage> {
    return this.http.post<TicketMessage>(`${this.api}/tickets/${ticketId}/messages`, {
      body,
      images,
    });
  }

  updateStatus(ticketId: number, status: TicketStatus): Observable<TicketDetail> {
    return this.http.patch<TicketDetail>(`${this.api}/tickets/${ticketId}`, { status });
  }

  fetchUnreadCount(): Observable<number> {
    return this.http.get<{ unread_count: number }>(`${this.api}/tickets/unread-count`).pipe(
      tap(r => this.unread$.next(r.unread_count || 0)),
      switchMap(r => of(r.unread_count || 0)),
      catchError(() => of(0)),
    );
  }

  // Refrescar el badge al instante (después de abrir un ticket, p. ej.).
  refreshUnread(): void {
    if (!this.auth.isAuthenticated()) return;
    this.fetchUnreadCount().subscribe();
  }

  // Conteo para el panel de administración (tickets sin atender).
  fetchAdminUnreadCount(): void {
    if (!this.auth.isAuthenticated()) return;
    this.http.get<{ unread_count: number }>(`${this.api}/tickets/admin/unread-count`).pipe(
      catchError(() => of({ unread_count: 0 })),
    ).subscribe(r => this.adminUnread$.next(r.unread_count || 0));
  }

  // ───── Polling ─────
  // pollAdmin=true añade al ciclo el conteo de tickets sin atender (badge de
  // admin), para que el FAB muestre el número rojo también a los admins.
  startPolling(pollAdmin = false, intervalMs = 30_000): void {
    this.pollAdmin = this.pollAdmin || pollAdmin;
    if (this.pollingEnabled) {
      if (this.pollAdmin) this.fetchAdminUnreadCount();
      return;
    }
    this.pollingEnabled = true;
    this.refreshUnread();
    if (this.pollAdmin) this.fetchAdminUnreadCount();
    this.pollSub = interval(intervalMs).pipe(
      switchMap(() => {
        if (!this.auth.isAuthenticated()) return of(0);
        if (this.pollAdmin) this.fetchAdminUnreadCount();
        return this.fetchUnreadCount();
      }),
    ).subscribe();
  }

  stopPolling(): void {
    this.pollingEnabled = false;
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}

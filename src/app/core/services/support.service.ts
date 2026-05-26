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
  created_at: string;
  author: TicketAuthor | null;
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

  private pollSub: Subscription | null = null;
  private pollingEnabled = false;

  // ───── Tickets ─────
  createTicket(payload: CreateTicketPayload): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.api}/tickets`, payload);
  }

  listTickets(status?: TicketStatus | null): Observable<TicketSummary[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<TicketSummary[]>(`${this.api}/tickets`, { params });
  }

  getTicket(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${this.api}/tickets/${id}`);
  }

  addMessage(ticketId: number, body: string): Observable<TicketMessage> {
    return this.http.post<TicketMessage>(`${this.api}/tickets/${ticketId}/messages`, { body });
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

  // ───── Polling ─────
  startPolling(intervalMs = 30_000): void {
    if (this.pollingEnabled) return;
    this.pollingEnabled = true;
    this.refreshUnread();
    this.pollSub = interval(intervalMs).pipe(
      switchMap(() => this.auth.isAuthenticated() ? this.fetchUnreadCount() : of(0)),
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

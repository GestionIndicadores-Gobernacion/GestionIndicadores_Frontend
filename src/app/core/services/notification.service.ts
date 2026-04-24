// core/services/notification.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  category: string;
  entity_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {

  private api = `${environment.apiUrl}/notifications`;
  private pollSub: Subscription | null = null;
  private pollingEnabled = false;
  private visibilityHandler: (() => void) | null = null;

  private unreadCount$ = new BehaviorSubject<number>(0);
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  readonly unreadCount = this.unreadCount$.asObservable();
  readonly notifications = this.notifications$.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Inicia polling cada 30 segundos.
   * Si la pestaña está en background, se pausa automáticamente y se
   * reanuda al volver a primer plano (ahorra ~31 requests/min inútiles).
   */
  startPolling(): void {
    this.pollingEnabled = true;
    this.fetchAll();
    this.fetchCount();
    this.startInterval();

    if (typeof document !== 'undefined' && !this.visibilityHandler) {
      this.visibilityHandler = () => {
        if (document.hidden) {
          this.pauseInterval();
        } else if (this.pollingEnabled) {
          this.fetchCount();
          this.startInterval();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  stopPolling(): void {
    this.pollingEnabled = false;
    this.pauseInterval();
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private startInterval(): void {
    if (this.pollSub) return;
    this.pollSub = interval(30_000).pipe(
      switchMap(() => this.http.get<{ unread_count: number }>(`${this.api}/count`))
    ).subscribe(res => {
      this.unreadCount$.next(res.unread_count);
    });
  }

  private pauseInterval(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  /** Limpia estado local (llamar desde AuthService.logout). */
  reset(): void {
    this.stopPolling();
    this.unreadCount$.next(0);
    this.notifications$.next([]);
  }

  fetchCount(): void {
    this.http.get<{ unread_count: number }>(`${this.api}/count`).subscribe(res => {
      this.unreadCount$.next(res.unread_count);
    });
  }

  fetchAll(): void {
    this.http.get<Notification[]>(this.api).subscribe(list => {
      this.notifications$.next(list);
      this.unreadCount$.next(list.filter(n => !n.is_read).length);
    });
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.api}/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.notifications$.value.map(n =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        );
        this.notifications$.next(current);
        this.unreadCount$.next(current.filter(n => !n.is_read).length);
      })
    );
  }

  markAllAsRead(): Observable<{ marked: number }> {
    return this.http.put<{ marked: number }>(`${this.api}/read-all`, {}).pipe(
      tap(() => {
        const current = this.notifications$.value.map(n => ({
          ...n, is_read: true, read_at: new Date().toISOString()
        }));
        this.notifications$.next(current);
        this.unreadCount$.next(0);
      })
    );
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
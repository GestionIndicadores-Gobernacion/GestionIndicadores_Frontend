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

  private unreadCount$ = new BehaviorSubject<number>(0);
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  readonly unreadCount = this.unreadCount$.asObservable();
  readonly notifications = this.notifications$.asObservable();

  constructor(private http: HttpClient) {}

  /** Inicia polling cada 30 segundos */
  startPolling(): void {
    this.fetchAll();
    this.fetchCount();
    this.pollSub = interval(30_000).pipe(
      switchMap(() => this.http.get<{ unread_count: number }>(`${this.api}/count`))
    ).subscribe(res => {
      this.unreadCount$.next(res.unread_count);
    });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
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
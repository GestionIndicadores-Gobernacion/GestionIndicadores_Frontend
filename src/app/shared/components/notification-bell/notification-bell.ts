// shared/components/notification-bell/notification-bell.ts
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Notification, NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
})
export class NotificationBellComponent implements OnInit, OnDestroy {

  isOpen = false;
  unreadCount = 0;
  notifications: Notification[] = [];

  private subs: Subscription[] = [];

  constructor(
    private notifService: NotificationService,
    private elRef: ElementRef,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.notifService.startPolling();
    this.subs.push(
      this.notifService.unreadCount.subscribe(c => this.unreadCount = c),
      this.notifService.notifications.subscribe(n => this.notifications = n),
    );
  }

  ngOnDestroy(): void {
    this.notifService.stopPolling();
    this.subs.forEach(s => s.unsubscribe());
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.notifService.fetchAll();
  }

  markAsRead(notif: Notification): void {
    if (!notif.is_read) {
      this.notifService.markAsRead(notif.id).subscribe();
    }
    if (notif.category === 'action_plan' && notif.entity_id) {
      this.isOpen = false;
      this.router.navigate(['/action-plans/calendar'], {
        queryParams: { planId: notif.entity_id }
      });
    } else if (notif.category === 'action_plan_reminder' && notif.entity_id) {
      this.isOpen = false;
      this.router.navigate(['/action-plans/calendar'], {
        queryParams: { reportActivity: notif.entity_id }
      });
    }
  }

  markAllRead(): void {
    this.notifService.markAllAsRead().subscribe();
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
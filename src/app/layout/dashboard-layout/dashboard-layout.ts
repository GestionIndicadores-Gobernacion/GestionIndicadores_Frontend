import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SidebarComponent } from './sidebar/sidebar';
import { SidebarService } from '../../core/services/sidebar.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    NotificationBellComponent,
    LucideAngularModule,
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayoutComponent {
  private sidebarService = inject(SidebarService);

  toggleSidebar() {
    this.sidebarService.toggle();
  }

}

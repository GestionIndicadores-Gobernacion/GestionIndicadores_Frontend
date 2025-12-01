import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent {
  constructor(
    private auth: AuthService,
    private sidebar: SidebarService

  ) { }

  logout() {
    this.auth.logout();
    window.location.href = '/auth/login';
  }

  toggleSidebar() {
    this.sidebar.toggle();
  }
}

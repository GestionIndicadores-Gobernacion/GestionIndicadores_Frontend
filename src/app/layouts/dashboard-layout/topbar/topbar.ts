import { Component } from '@angular/core';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent {
  constructor(
    private sidebar: SidebarService

  ) { }

  toggleSidebar() {
    this.sidebar.toggle();
  }
}

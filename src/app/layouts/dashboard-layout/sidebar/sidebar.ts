import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {

  isOpen = false;
  isSuperAdmin = false;
  isViewer = false;
  isEditor = false;

  user: any = null;

  constructor(private sidebarService: SidebarService) {

    const userString = localStorage.getItem('user');
    if (userString) {
      this.user = JSON.parse(userString);
      this.isSuperAdmin = this.user.role?.name === 'SuperAdmin';
      this.isViewer = this.user.role?.name === 'Viewer';
      this.isEditor = this.user.role?.name === 'Editor';
    }

    this.sidebarService.isOpen$.subscribe(value => {
      this.isOpen = value;
    });
  }

  // Métodos que llaman al service
  openSidebar() {
    this.sidebarService.open();
  }

  closeSidebar() {
    this.sidebarService.close();
  }

}


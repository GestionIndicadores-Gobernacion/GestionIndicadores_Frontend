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
  isAdmin = false;

  constructor(private sidebarService: SidebarService) {

    // Recuperar rol del usuario
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      this.isAdmin = user.role_id === 1;
    }

    // Escuchar cambios del sidebar (abrir/cerrar)
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

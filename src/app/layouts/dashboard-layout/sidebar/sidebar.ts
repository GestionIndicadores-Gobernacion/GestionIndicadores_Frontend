import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  label: string;
  route?: string;
  disabled?: boolean;
  roles?: string[];
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {

  isOpen = false;
  user: any = null;
  role = '';

  menu: MenuItem[] = [];

  // 🔹 estado del colapsable
  expandedSections: Record<string, boolean> = {
    Informes: true, // abierto por defecto
  };

  constructor(
    private sidebarService: SidebarService,
    private router: Router,
    private authService: AuthService
  ) {
    const userString = localStorage.getItem('user');
    if (userString) {
      this.user = JSON.parse(userString);
      this.role = this.user.role?.name;
    }

    this.sidebarService.isOpen$.subscribe(v => this.isOpen = v);

    // 🔥 AUTO-EXPANDIR INFORMES PYBA SEGÚN RUTA
    this.router.events.subscribe(() => {
      if (this.isRecordsSectionActive()) {
        this.expandedSections['Informes PYBA'] = true;
      }
    });

    this.buildMenu();
  }


  isRecordsSectionActive(): boolean {
    return this.router.url.startsWith('/records');
  }

  toggleSection(label: string) {
    this.expandedSections[label] = !this.expandedSections[label];
  }

  isExpanded(label: string): boolean {
    return !!this.expandedSections[label];
  }

  canShow(item: MenuItem): boolean {
    if (!item.roles) return true;
    return item.roles.includes(this.role);
  }

  closeSidebar() {
    this.sidebarService.close();
  }

  buildMenu() {
    this.menu = [
      { label: 'Dashboard', route: 'dashboard' },

      {
        label: 'Reportes PYBA',
        children: [
          { label: 'Reportes', route: 'records' },
          { label: 'Estrategias', route: 'records/strategies', roles: ['SuperAdmin'] },
          { label: 'Actividades', route: 'records/activities', roles: ['SuperAdmin'] },
          { label: 'Componentes Estratégicos', route: 'records/components', roles: ['SuperAdmin'] },
          { label: 'Indicadores', route: 'records/indicators', roles: ['SuperAdmin'] },
        ]
      }
      ,

      { label: 'Planes de acción', disabled: true, roles: ['Editor', 'SuperAdmin'] },
      { label: 'Bases de datos', disabled: true, roles: ['Editor', 'SuperAdmin'] },
      { label: 'Usuarios', route: 'users', roles: ['SuperAdmin'] }
    ];
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

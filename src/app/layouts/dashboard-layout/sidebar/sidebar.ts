import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  label: string;
  route?: string;
  disabled?: boolean;
  roles?: number[]; // role_id
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

  // ===============================
  // USER INFO (UI ONLY)
  // ===============================
  roleId: number | null = null;

  userName = '';
  userEmail = '';
  profileImageUrl: string | null = null;
  userInitial = '';
  roleLabel = '';

  // ===============================
  // MENU
  // ===============================
  menu: MenuItem[] = [];

  expandedSections: Record<string, boolean> = {
    'Reportes PYBA': true,
  };

  constructor(
    private sidebarService: SidebarService,
    private router: Router,
    private authService: AuthService
  ) {

    const userString = localStorage.getItem('user');
    if (userString) {
      console.log(JSON.parse(userString));
    }

    // ===============================
    // USER INFO (FROM BACKEND)
    // ===============================
    const user = this.authService.getUser();

    if (user) {
      this.userName = `${user.first_name} ${user.last_name}`;
      this.userEmail = user.email;
      this.profileImageUrl = user.profile_image_url;
      this.userInitial = this.userName.charAt(0);

      // 🔑 ROL REAL (backend)
      this.roleLabel = user.role?.name ?? '';
      this.roleId = user.role?.id ?? null;
    }

    // ===============================
    // SIDEBAR STATE
    // ===============================
    this.sidebarService.isOpen$.subscribe(v => this.isOpen = v);

    // Auto-expand Reportes cuando la ruta aplica
    this.router.events.subscribe(() => {
      if (this.isReportsSectionActive()) {
        this.expandedSections['Reportes PYBA'] = true;
      }
    });

    this.buildMenu();
  }

  // ===============================
  // ROUTE HELPERS
  // ===============================
  isReportsSectionActive(): boolean {
    return this.router.url.startsWith('/reports');
  }

  toggleSection(label: string) {
    this.expandedSections[label] = !this.expandedSections[label];
  }

  isExpanded(label: string): boolean {
    return !!this.expandedSections[label];
  }

  // ===============================
  // PERMISSIONS (UI)
  // ===============================
  canShow(item: MenuItem): boolean {
    if (!item.roles) return true;
    if (!this.roleId) return false;

    return item.roles.includes(this.roleId);
  }

  hasVisibleChildren(item: MenuItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => this.canShow(child));
  }

  // ===============================
  // MENU BUILDER
  // ===============================
  buildMenu() {
    this.menu = [
      {
        label: 'Dashboard',
        route: 'dashboard',

      },
      {
        label: 'Reportes PYBA',
        roles: [2, 3],
        children: [
          { label: 'Reportes', route: 'reports' },

          { label: 'Estrategias', route: 'reports/strategies', roles: [3] },
          { label: 'Componentes Estratégicos', route: 'reports/components', roles: [3] },
        ],
      },
      {
        label: 'Bases de datos',
        roles: [1, 2, 3],
        children: [
          { label: 'Dataset', route: 'datasets' },
          { label: 'Tablas', route: 'datasets/tables' }
        ],
      },
      {
        label: 'Planes de acción',
        disabled: true,
        roles: [1, 2, 3],
      },
      {
        label: 'Usuarios',
        route: 'users',
        disabled: true,
        roles: [3],
      },
    ];
  }

  // ===============================
  // LOGOUT
  // ===============================
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  closeSidebar() {
    this.sidebarService.close();
  }
}

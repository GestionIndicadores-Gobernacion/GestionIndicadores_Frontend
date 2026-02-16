import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { SidebarService } from '../../../core/services/sidebar.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService } from '../../../core/services/menu.service';

interface MenuItem {
  label: string;
  route?: string;
  disabled?: boolean;
  roles?: number[];
  icon?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit, OnDestroy {

  // ===============================
  // SIDEBAR STATE
  // ===============================
  isOpen = false; // Cerrado por defecto en móvil

  // ===============================
  // USER INFO
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

  // ===============================
  // SUBSCRIPTIONS
  // ===============================
  private sidebarSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private sidebarService: SidebarService,
    private router: Router,
    private authService: AuthService,
    private menuService: MenuService,
  ) {
    // ===== USER DATA =====
    const user = this.authService.getUser();

    if (user) {
      this.userName = `${user.first_name} ${user.last_name}`;
      this.userEmail = user.email;
      this.profileImageUrl = user.profile_image_url;
      this.userInitial = this.userName.charAt(0).toUpperCase();
      this.roleLabel = user.role?.name ?? '';
      this.roleId = user.role?.id ?? null;
    }

    // ===== MENU =====
    this.menu = this.menuService.getMenu();
  }

  ngOnInit() {
    // ===== SIDEBAR STATE =====
    this.sidebarSubscription = this.sidebarService.isOpen$.subscribe(v => {
      this.isOpen = v;
    });

    // ===== AUTO EXPAND SECTION ON NAVIGATION =====
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isReportsSectionActive()) {
          this.expandedSections['Reportes PYBA'] = true;
        }

        // Auto-close sidebar on mobile after navigation
        if (window.innerWidth < 768) {
          this.sidebarService.close();
        }
      });

    // Check initial route
    if (this.isReportsSectionActive()) {
      this.expandedSections['Reportes PYBA'] = true;
    }

    // Set initial state based on screen size
    if (window.innerWidth >= 768) {
      this.sidebarService.open();
    }
  }

  ngOnDestroy() {
    this.sidebarSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  // ===============================
  // TOGGLE
  // ===============================
  toggleSidebar() {
    this.sidebarService.toggle();
  }

  closeSidebar() {
    this.sidebarService.close();
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
  // PERMISSIONS
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
  // LOGOUT
  // ===============================
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { SidebarService } from '../../../core/services/sidebar.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService, MenuItem } from '../../../core/services/menu.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit, OnDestroy {

  // ===============================
  // SIDEBAR STATE
  // ===============================
  // Inicializado en el constructor desde SidebarService.isOpen para que
  // el primer change detection use el mismo valor que el emit sincrónico
  // del BehaviorSubject al suscribirse en ngOnInit. Sin esto, Angular
  // dispara NG0100 (ExpressionChangedAfterItHasBeenChecked). El estado
  // por viewport lo decide el servicio (singleton): abierto en desktop,
  // cerrado en móvil.
  isOpen!: boolean;

  // ===============================
  // USER INFO
  // ===============================
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
    // Igualar el estado local al del servicio ANTES del primer render.
    // El servicio ya decidió el valor según viewport en su construcción.
    this.isOpen = this.sidebarService.isOpen;

    // ===== USER DATA =====
    const user = this.authService.getUser();

    if (user) {
      this.userName = `${user.first_name} ${user.last_name}`;
      this.userEmail = user.email;
      this.profileImageUrl = user.profile_image_url;
      this.userInitial = this.userName.charAt(0).toUpperCase();
      this.roleLabel = user.role?.name ?? '';
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

    // Nota: el estado inicial según viewport lo resuelve SidebarService
    // en su constructor (singleton). No hace falta abrir/cerrar aquí.
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
  // Delegan en MenuService para no duplicar la lógica perm + rol (modo dual).
  canShow(item: MenuItem): boolean {
    return this.menuService.canShow(item);
  }

  hasVisibleChildren(item: MenuItem): boolean {
    return this.menuService.hasVisibleChildren(item);
  }

  // ===============================
  // LOGOUT
  // ===============================
  logout() {
    // logoutFromServer() revoca el access y el refresh en el backend
    // (tolerante a errores) y luego limpia la sesión local + navega.
    // No suscribirse causaría que el observable nunca se ejecute.
    this.authService.logoutFromServer().subscribe();
  }
}
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService, MenuItem } from '../../../core/services/menu.service';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-dashboard.html',
})
export class HomeDashboardComponent {

  roleId: number | null = null;
  sections: DashboardSectionVM[] = [];

  constructor(
    private authService: AuthService,
    private menuService: MenuService
  ) {
    const user = this.authService.getUser();
    this.roleId = user?.role?.id ?? null;

    this.sections = this.buildDashboardSections();
  }

  // =========================================================
  // PERMISSIONS
  // =========================================================
  private canShow(item: MenuItem): boolean {
    if (item.disabled) return false;
    if (!item.roles) return true;
    if (!this.roleId) return false;
    return item.roles.includes(this.roleId);
  }

  // =========================================================
  // BUILD VIEW MODEL
  // =========================================================
  private buildDashboardSections(): DashboardSectionVM[] {

    return this.menuService.getMenu()
      .filter(section => section.label !== 'Dashboard')
      .map(section => {

        if (!section.children) return null;

        const visibleChildren = section.children.filter(c => this.canShow(c));
        if (!visibleChildren.length) return null;

        return {
          title: section.label,
          description: this.getSectionDescription(section.label),
          items: visibleChildren.map(child => ({
            label: child.label,
            route: child.route!,
            description: this.getItemDescription(child.route!)
          }))
        };

      })
      .filter(Boolean) as DashboardSectionVM[];
  }

  // =========================================================
  // TEXT CONTENT (UI ONLY)
  // =========================================================
  private getSectionDescription(label: string): string {
    switch (label) {
      case 'Reportes PYBA':
        return 'Gestión del cumplimiento de metas e indicadores del plan.';
      case 'Bases de datos':
        return 'Administración de la estructura y fuentes de información.';
      default:
        return '';
    }
  }

  private getItemDescription(route: string): string {
    switch (route) {
      case 'reports':
        return 'Consultar y registrar avances.';
      case 'reports/strategies':
        return 'Organizar la estructura estratégica.';
      case 'reports/components':
        return 'Relacionar componentes e indicadores.';
      case 'datasets':
        return 'Gestionar fuentes de datos.';
      case 'datasets/tables':
        return 'Configurar tablas del sistema.';
      default:
        return '';
    }
  }

}


/* ===================================================== */

interface DashboardSectionVM {
  title: string;
  description: string;
  items: DashboardItemVM[];
}

interface DashboardItemVM {
  label: string;
  route: string;
  description: string;
}

import { Injectable } from '@angular/core';

export interface MenuItem {
  label: string;
  route?: string;
  disabled?: boolean;
  roles?: number[];
  icon?: string;          // nombre de icono Lucide (kebab-case)
  children?: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {

  getMenu(): MenuItem[] {
    return [
      { label: 'Dashboard', route: 'dashboard', icon: 'layout-dashboard' },

      {
        label: 'Reportes PYBA',
        icon: 'clipboard-list',
        roles: [1, 2, 3, 4],
        children: [
          { label: 'Reportes', route: 'reports', icon: 'file-text' },
          {
            label: 'Estrategias',
            route: 'reports/strategies',
            icon: 'target',
            roles: [3],
            children: [
              { label: 'Plan de Desarrollo', route: 'reports/strategies/dashboard', roles: [3] },
            ],
          },
          { label: 'Componentes Estratégicos', route: 'reports/components', icon: 'layers', roles: [3] },
        ],
      },

      {
        label: 'Bases de datos',
        icon: 'database',
        roles: [3],
        children: [
          { label: 'Gestión de Base de Datos y Tablas', route: 'datasets', icon: 'table' },
        ],
      },

      {
        label: 'Planes de acción',
        route: 'action-plans',
        icon: 'list-todo',
        roles: [2, 3, 4],  // sin viewer
        children: [
          { label: 'Calendario', route: 'action-plans/calendar', icon: 'calendar-days' },
        ],
      },

      {
        label: 'Usuarios',
        route: 'users',
        icon: 'users',
        roles: [3],
      },

      {
        label: 'Historial',
        route: 'audit-history',
        icon: 'history',
        roles: [3],
      },
    ];
  }

}

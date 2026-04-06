import { Injectable } from '@angular/core';

export interface MenuItem {
  label: string;
  route?: string;
  disabled?: boolean;
  roles?: number[];
  children?: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {

  getMenu(): MenuItem[] {
    return [
      { label: 'Dashboard', route: 'dashboard' },

      {
        label: 'Reportes PYBA',
        roles: [1, 2, 3, 4],
        children: [
          { label: 'Reportes', route: 'reports' },
          {
            label: 'Estrategias',
            route: 'reports/strategies',
            roles: [3],
            children: [
              { label: 'Plan de Desarrollo', route: 'reports/strategies/dashboard', roles: [3] },
            ],
          },
          { label: 'Componentes Estratégicos', route: 'reports/components', roles: [3] },
        ],
      },

      {
        label: 'Bases de datos',
        roles: [3],
        children: [
          { label: 'Gestión de Base de Datos y Tablas', route: 'datasets' },
        ],
      },

      {
        label: 'Planes de acción',
        route: 'action-plans',
        roles: [2, 3, 4],  // sin viewer
        children: [
          { label: 'Calendario', route: 'action-plans/calendar' },
        ],
      },

      {
        label: 'Usuarios',
        route: 'users',
        roles: [3],
      },
    ];
  }

}

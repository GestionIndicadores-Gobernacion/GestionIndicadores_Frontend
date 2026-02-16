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
        roles: [3],
      },
    ];
  }

}

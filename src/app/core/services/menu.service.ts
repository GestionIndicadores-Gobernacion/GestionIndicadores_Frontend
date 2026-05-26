import { Injectable, inject } from '@angular/core';

import { PERMS, PermCode } from '../constants/permissions';
import { PermissionService } from './permission.service';
import { AuthService } from './auth.service';

export interface MenuItem {
  label: string;
  route?: string;
  disabled?: boolean;
  roles?: number[];
  perms?: PermCode[];
  permsMode?: 'any' | 'all';
  icon?: string;          // nombre de icono Lucide (kebab-case)
  children?: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {

  private perms = inject(PermissionService);
  private auth = inject(AuthService);

  getMenu(): MenuItem[] {
    return [
      { label: 'Dashboard', route: 'dashboard', icon: 'layout-dashboard' },

      {
        label: 'Reportes PYBA',
        icon: 'clipboard-list',
        roles: [1, 2, 3, 4],
        perms: [PERMS.REPORTS_READ],
        children: [
          {
            label: 'Reportes',
            route: 'reports',
            icon: 'file-text',
            roles: [1, 2, 3, 4],
            perms: [PERMS.REPORTS_READ],
          },
          {
            label: 'Estrategias',
            route: 'reports/strategies',
            icon: 'target',
            roles: [3],
            perms: [PERMS.STRATEGIES_MANAGE],
            children: [
              {
                label: 'Plan de Desarrollo',
                route: 'reports/strategies/dashboard',
                roles: [3],
                perms: [PERMS.STRATEGIES_MANAGE],
              },
            ],
          },
          {
            label: 'Componentes Estratégicos',
            route: 'reports/components',
            icon: 'layers',
            roles: [3],
            perms: [PERMS.COMPONENTS_MANAGE],
          },
        ],
      },

      {
        label: 'Bases de datos',
        icon: 'database',
        roles: [3],
        perms: [PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE],
        children: [
          {
            label: 'Gestión de Base de Datos y Tablas',
            route: 'datasets',
            icon: 'table',
            roles: [3],
            perms: [PERMS.DATASETS_READ, PERMS.DATASETS_MANAGE],
          },
        ],
      },

      {
        label: 'Planes de acción',
        route: 'action-plans',
        icon: 'list-todo',
        roles: [2, 3, 4],  // sin viewer
        perms: [PERMS.ACTION_PLANS_READ],
        children: [
          {
            label: 'Calendario',
            route: 'action-plans/calendar',
            icon: 'calendar-days',
            roles: [2, 3, 4],
            perms: [PERMS.ACTION_PLANS_READ],
          },
        ],
      },

      {
        label: 'Administración',
        icon: 'shield-check',
        roles: [3],  // solo admin; el perm requerido es ROLES_MANAGE para que
        perms: [PERMS.ROLES_MANAGE],  // entrar implique poder gestionar.
        children: [
          {
            label: 'Roles y permisos',
            route: 'admin/roles',
            icon: 'lock',
            roles: [3],
            perms: [PERMS.ROLES_MANAGE],
          },
        ],
      },

      {
        label: 'Usuarios',
        route: 'users',
        icon: 'users',
        roles: [3],
        perms: [PERMS.USERS_MANAGE],
      },

      {
        label: 'Historial',
        route: 'audit-history',
        icon: 'history',
        roles: [3],
        perms: [PERMS.AUDIT_READ],
      },
    ];
  }

  // Modo dual transitorio (Fase C): se evalúan en paralelo permisos y rol.
  // Si cualquiera concede acceso, el item se muestra; así la UI no se
  // esconde mientras `role_permissions` aún no cubre todo el catálogo.
  canShow(item: MenuItem): boolean {
    if (item.disabled === true) return false;

    const hasPerms = !!item.perms && item.perms.length > 0;
    const hasRoles = !!item.roles && item.roles.length > 0;

    if (!hasPerms && !hasRoles) return true;

    const permGranted = hasPerms
      ? (item.permsMode === 'all'
          ? this.perms.hasAll(...item.perms!)
          : this.perms.hasAny(...item.perms!))
      : false;

    const roleId = this.auth.getTokenPayload()?.role_id;
    const roleGranted = hasRoles
      ? (roleId != null && item.roles!.includes(roleId))
      : false;

    return permGranted || roleGranted;
  }

  hasVisibleChildren(item: MenuItem): boolean {
    return !!item.children && item.children.some(c => this.canShow(c));
  }

  getVisibleMenu(): MenuItem[] {
    const filterTree = (items: MenuItem[]): MenuItem[] =>
      items
        .filter(it => this.canShow(it))
        .map(it => it.children
          ? { ...it, children: filterTree(it.children) }
          : { ...it });

    return filterTree(this.getMenu());
  }

}

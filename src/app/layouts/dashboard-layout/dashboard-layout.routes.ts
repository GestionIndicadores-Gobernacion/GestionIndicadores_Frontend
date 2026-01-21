import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';

export const DASHBOARD_LAYOUT_ROUTES: Routes = [

  // ACCESIBLE A TODOS LOS ROLES
  {
    path: '',
    loadComponent: () =>
      import('../../features/dashboard/home-dashboard/home-dashboard')
        .then(m => m.HomeDashboardComponent),
  },

  {
    path: 'records',
    loadChildren: () =>
      import('../../features/records/records.routes')
        .then(m => m.RECORDS_ROUTES),
  },

  // 🔒 SOLO SUPERADMIN
  {
    path: 'users',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('../../features/users/users.routes')
        .then(m => m.USERS_ROUTES),
  },
  {
    path: 'strategies',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('../../features/strategy/strategy.routes')
        .then(m => m.STRATEGY_ROUTES),
  },
  {
    path: 'activities',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('../../features/activities/activities.routes')
        .then(m => m.ACTIVITIES_ROUTES),
  },
  {
    path: 'indicators',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('../../features/indicators/indicators.routes')
        .then(m => m.INDICATORS_ROUTES),
  },
  {
    path: 'components',
    canActivate: [adminGuard],
    loadChildren: () =>
      import('../../features/componentes/componentes.routes')
        .then(m => m.COMPONENTS_ROUTES),
  },
];

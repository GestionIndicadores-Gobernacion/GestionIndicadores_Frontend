import { Routes } from '@angular/router';
import { adminGuard } from '../../../core/guards/admin-guard';

export const RECORDS_ROUTES: Routes = [

  // 📄 LISTADO
  {
    path: '',
    loadComponent: () =>
      import('./records-list/records-list')
        .then(m => m.RecordsListComponent),
  },

  // ➕ CREAR
  {
    path: 'create',
    loadComponent: () =>
      import('./record-form/record-form')
        .then(m => m.RecordFormComponent),
  },

  // 🔽 SUBMÓDULOS (PRIMERO)
  {
    path: '',
    canActivateChild: [adminGuard],
    children: [
      {
        path: 'strategies',
        loadChildren: () =>
          import('../strategy/strategy.routes')
            .then(m => m.STRATEGY_ROUTES),
      },
      {
        path: 'activities',
        loadChildren: () =>
          import('../activities/activities.routes')
            .then(m => m.ACTIVITIES_ROUTES),
      },
      {
        path: 'components',
        loadChildren: () =>
          import('../componentes/componentes.routes')
            .then(m => m.COMPONENTS_ROUTES),
      },
      {
        path: 'indicators',
        loadChildren: () =>
          import('../indicators/indicators.routes')
            .then(m => m.INDICATORS_ROUTES),
      },
    ],
  },

  // ✏️ EDITAR (AL FINAL)
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./record-form/record-form')
        .then(m => m.RecordFormComponent),
  },

  // 🔍 DETALLE (AL FINAL DE TODO)
  {
    path: ':id',
    loadComponent: () =>
      import('./record-detail/record-detail')
        .then(m => m.RecordDetailComponent),
  },
];

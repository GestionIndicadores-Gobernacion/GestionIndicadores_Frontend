import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';

export const DATASETS_ROUTES: Routes = [

  // 📄 LISTADO
  {
    path: '',
    loadComponent: () =>
      import('./datasets/datasets-list/datasets-list')
        .then(m => m.DatasetsListComponent),
  },

  // ➕ CREAR
  {
    path: 'create',
    loadComponent: () =>
      import('./datasets/dataset-form/dataset-form')
        .then(m => m.DatasetFormComponent),
  },

  // 🔽 SUBMÓDULOS (OPCIONAL – PREPARADO)
  {
    path: '',
    canActivateChild: [adminGuard],
    children: [
      {
        path: '',
        canActivateChild: [adminGuard],
        children: [
          {
            path: 'tables',
            loadChildren: () =>
              import('../datasets/tables/tables.routes')
                .then(m => m.TABLES_ROUTES),
          }
        ],
      },

    ],
  },

  {
    path: ':id/edit',
    loadComponent: () =>
      import('./datasets/dataset-form/dataset-form')
        .then(m => m.DatasetFormComponent),
  },

];

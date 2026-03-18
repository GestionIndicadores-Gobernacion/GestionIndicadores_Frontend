import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin-guard';

export const DATASETS_ROUTES: Routes = [

  // 📄 LISTADO
  {
    path: '',
    loadComponent: () =>
      import('./datasets-list/datasets-list')
        .then(m => m.DatasetsListComponent),
  },

  // 👁️ VISOR
  {
    path: 'tables/:tableId/records',
    loadComponent: () =>
      import('./tables/table-viewer/table-viewer')
        .then(m => m.TableViewerComponent),
  },
];
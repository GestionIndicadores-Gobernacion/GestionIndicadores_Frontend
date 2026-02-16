import { RecordsListComponent } from '../records/records-list/records-list';
import { RecordsFormComponent } from '../records/records-form/records-form';

export const TABLES_ROUTES = [
  {
    path: '',
    loadComponent: () =>
      import('./tables-list/tables-list')
        .then(m => m.TablesListComponent),
  },

  {
    path: ':tableId/records',
    children: [
      {
        path: '',
        component: RecordsListComponent
      },
      {
        path: 'create',
        component: RecordsFormComponent
      },
      {
        path: ':id/edit',
        component: RecordsFormComponent
      }
    ]
  }
];

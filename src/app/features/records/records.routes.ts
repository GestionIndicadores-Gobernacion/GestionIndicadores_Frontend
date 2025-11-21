import { Routes } from '@angular/router';

export const RECORDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./records-list/records-list')
        .then(m => m.RecordsListComponent),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./record-form/record-form')
        .then(m => m.RecordFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./record-detail/record-detail')
        .then(m => m.RecordDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./record-form/record-form')
        .then(m => m.RecordFormComponent),
  },
];

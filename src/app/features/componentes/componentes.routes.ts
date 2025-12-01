import { Routes } from '@angular/router';

export const COMPONENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./componente-list/componente-list')
        .then(m => m.ComponentesListComponent),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./componente-form/componente-form')
        .then(m => m.ComponentesFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./componente-form/componente-form')
        .then(m => m.ComponentesFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./componente-detail/componente-detail')
        .then(m => m.ComponenteDetailComponent),
  },
];

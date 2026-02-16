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
        .then(m => m.ComponenteFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./componente-form/componente-form')
        .then(m => m.ComponenteFormComponent),
  }
];

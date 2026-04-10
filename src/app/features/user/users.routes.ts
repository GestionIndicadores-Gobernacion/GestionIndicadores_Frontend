import { Routes } from '@angular/router';

// users.routes.ts
export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./users-list/users-list')
        .then(m => m.UsersListComponent),
  },

  {
    path: 'create',
    loadComponent: () =>
      import('./user-form/user-form')
        .then(m => m.UserFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./user-form/user-form')
        .then(m => m.UserFormComponent),
  },
];
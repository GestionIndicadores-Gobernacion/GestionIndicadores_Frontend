import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./users-list/users-list')
        .then(m => m.UsersListComponent),
  },
  {
    path: 'me',
    loadComponent: () =>
      import('./my-profile/my-profile')
        .then(m => m.MyProfileComponent),
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

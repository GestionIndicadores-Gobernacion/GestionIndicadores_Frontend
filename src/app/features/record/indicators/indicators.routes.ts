import { Routes } from '@angular/router';

export const INDICATORS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./indicators-list/indicators-list').then(
        (m) => m.IndicatorsListComponent
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./indicator-form/indicator-form').then(
        (m) => m.IndicatorFormComponent
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./indicator-form/indicator-form').then(
        (m) => m.IndicatorFormComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./indicator-detail/indicator-detail').then(
        (m) => m.IndicatorDetailComponent
      ),
  },
];

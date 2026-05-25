import { Routes } from '@angular/router';

export const ACTION_PLANS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'calendar',
    pathMatch: 'full',
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./action-plan-calendar/action-plan-calendar')
        .then(m => m.ActionPlanCalendarComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./action-plan-dashboard/action-plan-dashboard')
        .then(m => m.ActionPlanDashboardComponent),
  },
];
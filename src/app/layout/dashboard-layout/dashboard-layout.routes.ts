import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const DASHBOARD_LAYOUT_ROUTES: Routes = [

  {
    path: '',
    // chart.js + ng2-charts solo se necesitan en el home-dashboard (timeline +
    // reports-explorer-chart). Proveyendo aquí, el bundle de chart.js queda
    // dentro del chunk lazy de esta ruta y no contamina el initial bundle.
    providers: [provideCharts(withDefaultRegisterables())],
    loadComponent: () =>
      import('../../features/dashboard/home-dashboard/home-dashboard')
        .then(m => m.HomeDashboardComponent),
  },
];

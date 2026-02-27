import { Routes } from '@angular/router';

export const ACTION_PLANS_ROUTES: Routes = [

    // 🔀 Redirect raíz → calendario
    {
        path: '',
        redirectTo: 'calendar',
        pathMatch: 'full',
    },

    // 📅 CALENDARIO
    {
        path: 'calendar',
        loadComponent: () =>
            import('./action-plan-calendar/action-plan-calendar')
                .then(m => m.ActionPlanCalendarComponent),
    },



];
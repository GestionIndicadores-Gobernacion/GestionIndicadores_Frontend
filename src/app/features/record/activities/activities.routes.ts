export const ACTIVITIES_ROUTES = [
    {
        path: '',
        loadComponent: () =>
            import('./activities-list/activities-list')
                .then(m => m.ActivitiesListComponent),
    },
    {
        path: 'create',
        loadComponent: () =>
            import('./activities-form/activities-form')
                .then(m => m.ActivitiesFormComponent),
    },
    {
        path: ':id/edit',
        loadComponent: () =>
            import('./activities-form/activities-form')
                .then(m => m.ActivitiesFormComponent),
    },
];
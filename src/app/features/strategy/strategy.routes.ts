export const STRATEGY_ROUTES = [
    {
        path: '',
        loadComponent: () =>
            import('./strategy-list/strategy-list')
                .then(m => m.StrategyListComponent),
    },
    {
        path: 'create',
        loadComponent: () =>
            import('./strategy-form/strategy-form')
                .then(m => m.StrategyFormComponent),
    },
    {
        path: ':id/edit',
        loadComponent: () =>
            import('./strategy-form/strategy-form')
                .then(m => m.StrategyFormComponent),
    },
];
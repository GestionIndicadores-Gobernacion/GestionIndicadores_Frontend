export const MODEL_LIMITS = {
    COMPONENT_OBJECTIVE: {
        OBJECTIVE_NAME_MAX: 255,
    },

    COMPONENT: {
        COMPONENT_NAME_MAX: 255,
    },

    STRATEGY: {
        STRATEGY_NAME_MAX: 255,
        PRODUCT_GOAL_MAX: 500,
        REPORTING_METHOD_MAX: 255,
        GENERAL_OBJECTIVE_MAX: 500,
    },
    ACTIVITY_MGA: {
        DESCRIPTION_MAX: 255,
    },
    INDICATOR: {
        INDICATOR_NAME_MAX: 255,
    }
} as const;

// Default FlexLayout configuration
const defaultLayout = {
    global: {
        tabEnableClose: true,
        tabEnableFloat: true,
    },
    borders: [
        {
            type: 'border',
            location: 'left',
            size: 250,
            children: [
                {
                    type: 'tab',
                    name: 'Tasks',
                    component: 'TaskPanel'
                },
                {
                    type: 'tab',
                    name: 'Concepts',
                    component: 'ConceptPanel'
                },
                {
                    type: 'tab',
                    name: 'Demos',
                    component: 'DemoPanel'
                },
                {
                    type: 'tab',
                    name: 'System',
                    component: 'SystemStatusPanel'
                }
            ]
        },
        {
            type: 'border',
            location: 'bottom',
            size: 250,
            children: [
                {
                    type: 'tab',
                    name: 'Console',
                    component: 'ConsolePanel'
                },
                {
                    type: 'tab',
                    name: 'Priorities',
                    component: 'PriorityFluctuationPanel'
                },
                {
                    type: 'tab',
                    name: 'Relationships',
                    component: 'ConceptRelationshipPanel'
                },
                {
                    type: 'tab',
                    name: 'Trace',
                    component: 'ReasoningTracePanel'
                },
                {
                    type: 'tab',
                    name: 'Time Series',
                    component: 'TimeSeriesPanel'
                }
            ]
        }
    ],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 60,
                children: [
                    {
                        type: 'tab',
                        name: 'Dashboard',
                        component: 'DashboardPanel'
                    },
                    {
                        type: 'tab',
                        name: 'Main',
                        component: 'MainPanel'
                    },
                    {
                        type: 'tab',
                        name: 'Task Monitor',
                        component: 'TaskMonitorPanel'
                    }
                ]
            },
            {
                type: 'tabset',
                weight: 40,
                children: [
                    {
                        type: 'tab',
                        name: 'Cycles',
                        component: 'CyclePanel'
                    },
                    {
                        type: 'tab',
                        name: 'Variables',
                        component: 'VariablesPanel'
                    },
                    {
                        type: 'tab',
                        name: 'Input',
                        component: 'InputInterfacePanel'
                    }
                ]
            }
        ]
    }
};

export default defaultLayout;
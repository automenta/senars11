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
        }
      ]
    },
    {
      type: 'border',
      location: 'bottom',
      size: 200,
      children: [
        {
          type: 'tab',
          name: 'Console',
          component: 'ConsolePanel'
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
            name: 'Main',
            component: 'MainPanel'
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
          }
        ]
      }
    ]
  }
};

export default defaultLayout;
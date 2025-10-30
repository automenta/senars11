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
      size: 200,
      children: [
        {
          type: 'tab',
          name: 'Explorer',
          component: 'ExplorerPanel'
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
        weight: 70,
        children: [
          {
            type: 'tab',
            name: 'Main',
            component: 'MainPanel'
          }
        ]
      },
      {
        type: 'row',
        weight: 30,
        children: [
          {
            type: 'tabset',
            weight: 50,
            children: [
              {
                type: 'tab',
                name: 'Console',
                component: 'ConsolePanel'
              }
            ]
          },
          {
            type: 'tabset',
            weight: 50,
            children: [
              {
                type: 'tab',
                name: 'Variables',
                component: 'VariablesPanel'
              }
            ]
          }
        ]
      }
    ]
  }
};

export default defaultLayout;
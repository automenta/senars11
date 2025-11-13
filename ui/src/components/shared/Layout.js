/**
 * Layout: Parameterized layout components for multiple applications
 * Following AGENTS.md: Modular, Abstract, Parameterized
 */

import React, { memo } from 'react';
import { Layout as FlexLayout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { themeUtils } from '../utils/themeUtils.js';
import { Panel } from './Panel.js';

// Default layout configurations for different application types
const DEFAULT_LAYOUTS = Object.freeze({
  ide: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'row',
        weight: 30,
        children: [
          { type: 'tabset', weight: 50, children: [{ type: 'tab', component: 'ExplorerPanel', name: 'Explorer' }] },
          { type: 'tabset', weight: 50, children: [{ type: 'tab', component: 'VariablesPanel', name: 'Variables' }] }
        ]
      },
      {
        type: 'column',
        weight: 70,
        children: [
          { type: 'tabset', weight: 60, children: [{ type: 'tab', component: 'MainPanel', name: 'Main' }] },
          { type: 'tabset', weight: 40, children: [{ type: 'tab', component: 'ConsolePanel', name: 'Console' }] }
        ]
      }
    ]
  },
  graph: {
    type: 'row',
    weight: 100,
    children: [
      { type: 'tabset', children: [{ type: 'tab', component: 'GraphUI', name: 'Graph' }] }
    ]
  },
  dashboard: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'column',
        weight: 70,
        children: [
          { type: 'tabset', weight: 60, children: [{ type: 'tab', component: 'DashboardPanel', name: 'Dashboard' }] },
          { type: 'tabset', weight: 40, children: [{ type: 'tab', component: 'SystemStatusPanel', name: 'Status' }] }
        ]
      },
      {
        type: 'row',
        weight: 30,
        children: [
          { type: 'tabset', weight: 50, children: [{ type: 'tab', component: 'TaskPanel', name: 'Tasks' }] },
          { type: 'tabset', weight: 50, children: [{ type: 'tab', component: 'ConceptPanel', name: 'Concepts' }] }
        ]
      }
    ]
  }
});

// Layout factory function to create layout models
const createLayoutModel = (layoutType = 'ide', customLayout = null) => {
  const layout = customLayout || DEFAULT_LAYOUTS[layoutType] || DEFAULT_LAYOUTS.ide;
  return Model.fromJson(layout);
};

// Component factory for layout panels
const createComponentFactory = (contentMap) => {
  return (node) => {
    const component = node.getComponent();
    const ContentComponent = contentMap[component] || (() => `Content for ${component}`);
    const title = node.getName() || component.replace('Panel', '') || 'Panel';

    return React.createElement(Panel, { title },
      React.createElement(ContentComponent, { node })
    );
  };
};

// Parameterized layout component that can be used across applications
export const Layout = memo(({
  layoutType = 'ide',
  customLayout = null,
  contentMap = {},
  onLayoutChange = null,
  style = {},
  ...props
}) => {
  const [model, setModel] = React.useState(null);
  const layoutRef = React.useRef(null);

  React.useEffect(() => {
    const layoutModel = createLayoutModel(layoutType, customLayout);
    setModel(layoutModel);
  }, [layoutType, customLayout]);

  const handleLayoutChange = (newModel) => {
    const jsonLayout = newModel.toJson();
    onLayoutChange?.(jsonLayout);
  };

  const componentFactory = React.useMemo(() => 
    createComponentFactory(contentMap), [contentMap]
  );

  const containerStyle = {
    width: '100%',
    height: '100vh',
    ...style
  };

  if (!model) {
    return React.createElement('div', { 
      style: { 
        ...containerStyle, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: themeUtils.get('SPACING.LG') 
      } 
    },
      React.createElement('p', null, 'Loading layout...')
    );
  }

  return React.createElement('div', { style: containerStyle, ...props },
    React.createElement(FlexLayout, {
      model: model,
      ref: layoutRef,
      onModelChange: handleLayoutChange,
      factory: componentFactory,
      key: 'flexlayout-root'
    })
  );
});

// Layout manager component for handling multiple layout types
export const LayoutManager = memo(({
  layoutType = 'ide',
  availableLayouts = ['ide', 'graph', 'dashboard'],
  contentMap = {},
  onLayoutChange = null,
  children,
  style = {},
  ...props
}) => {
  const [currentLayout, setCurrentLayout] = React.useState(layoutType);
  const [customLayouts, setCustomLayouts] = React.useState({});

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    ...style
  };

  const toolbarStyle = {
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    display: 'flex',
    alignItems: 'center',
    gap: themeUtils.get('SPACING.SM')
  };

  const layoutButtonStyle = {
    padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    backgroundColor: currentLayout === 'ide' ? themeUtils.get('COLORS.PRIMARY') + '20' : themeUtils.get('BACKGROUNDS.PRIMARY'),
    cursor: 'pointer',
    fontSize: themeUtils.get('FONTS.SIZE.SM')
  };

  const handleLayoutSelect = (layout) => {
    setCurrentLayout(layout);
  };

  const handleCustomLayoutSave = (name) => {
    if (layoutRef.current?.model) {
      setCustomLayouts(prev => ({
        ...prev,
        [name]: layoutRef.current.model.toJson()
      }));
    }
  };

  return React.createElement('div', { style: containerStyle, ...props },
    React.createElement('div', { style: toolbarStyle },
      availableLayouts.map(layout => 
        React.createElement('button', {
          key: layout,
          style: {
            ...layoutButtonStyle,
            backgroundColor: currentLayout === layout ? themeUtils.get('COLORS.PRIMARY') + '20' : themeUtils.get('BACKGROUNDS.PRIMARY')
          },
          onClick: () => handleLayoutSelect(layout)
        }, layout.charAt(0).toUpperCase() + layout.slice(1))
      ),
      children
    ),
    React.createElement(Layout, {
      layoutType: currentLayout,
      customLayout: customLayouts[currentLayout],
      contentMap,
      onLayoutChange
    })
  );
});

export { DEFAULT_LAYOUTS, createLayoutModel, createComponentFactory };
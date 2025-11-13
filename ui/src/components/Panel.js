import React, { memo } from 'react';
import useUiStore from '../stores/uiStore.js';
import ErrorBoundary from './ErrorBoundary.js';
import { WebSocketStatus } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import { createHeader } from '../utils/componentUtils.js';

/**
 * Panel: A standard panel component with header, content area, and WebSocket status
 */
const Panel = memo(({
  title,
  children,
  showWebSocketStatus = true,
  showHeader = true,
  className = '',
  style = {},
  headerExtra = null
}) => {
  const wsConnected = useUiStore(state => state.wsConnected);

  // Memoized styles for performance
  const panelStyle = React.useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
    overflow: 'hidden',
    ...style
  }), [style]);

  const headerStyle = React.useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
  }), []);

  const contentStyle = React.useMemo(() => ({
    flex: 1,
    padding: themeUtils.get('SPACING.SM'),
    overflow: 'auto'
  }), []);

  const statusStyle = React.useMemo(() => ({
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    marginLeft: themeUtils.get('SPACING.SM'),
    padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
    backgroundColor: themeUtils.getWebSocketStatusBgColor(wsConnected),
    borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
  }), [wsConnected]);

  const headerContentStyle = React.useMemo(() => ({
    display: 'flex',
    alignItems: 'center'
  }), []);

  return React.createElement('div', { className, style: panelStyle },
    showHeader && React.createElement('div', { style: headerStyle },
      createHeader(React, { content: title, level: 3 }),
      React.createElement('div', { style: headerContentStyle },
        showWebSocketStatus && React.createElement(WebSocketStatus, {
          showLabel: true,
          style: statusStyle
        }),
        headerExtra
      )
    ),
    React.createElement('div', { style: contentStyle },
      React.createElement(ErrorBoundary, {
        componentName: 'Panel',
        showErrorDetails: false
      }, children)
    )
  );
});

export default Panel;
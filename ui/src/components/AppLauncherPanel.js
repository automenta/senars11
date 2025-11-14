/**
 * App Launcher Panel - Shows application selection options
 * Extracted from MergedLauncher for docking framework integration
 */

import React from 'react';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import { UI_APPS } from '../constants/uiApps.js';

const AppLauncherPanel = () => {
  // Navigation handler for app selection
  const navigateToApp = (app) => {
    const targetUrl = app.id === 'minimal-repl' ? '/repl/#minimal' : app.path;
    window.location.href = targetUrl;
  };

  // Create dynamic card styling based on app color
  const createCardStyle = React.useCallback((color) => ({
    cursor: 'pointer',
    transform: 'scale(1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderLeft: `4px solid ${color}`,
    ':hover': {
      transform: 'scale(1.02)',
      boxShadow: themeUtils.get('SHADOWS.MD')
    }
  }), []);

  // Common styles used across app cards
  const styles = {
    content: React.useMemo(() => ({ display: 'flex', alignItems: 'center' }), []),
    icon: React.useMemo(() => ({ fontSize: '1.5rem', marginRight: themeUtils.get('SPACING.SM') }), []),
    description: React.useMemo(() => ({ marginBottom: themeUtils.get('SPACING.MD') }), [])
  };

  // Filter out the 'merged' app to prevent circular navigation
  const availableApps = UI_APPS.filter(app => app.id !== 'merged');

  // Create app cards with consistent behavior
  const appCards = availableApps.map(app =>
    React.createElement('div', {
      key: app.id,
      style: createCardStyle(app.color),
      onClick: () => navigateToApp(app),
      onMouseEnter: (e) => e.target.style.transform = 'scale(1.02)',
      onMouseLeave: (e) => e.target.style.transform = 'scale(1)'
    },
      React.createElement(Card, {
        title: React.createElement('div', { style: styles.content },
          React.createElement('span', { style: styles.icon }, app.icon),
          app.name
        )
      },
        React.createElement('p', { style: styles.description }, app.description),
        React.createElement(Button, {
          variant: 'light',
          size: 'sm',
          onClick: (e) => {
            e.stopPropagation();
            navigateToApp(app);
          }
        }, 'Launch')
      )
    )
  );

  return React.createElement('div', { style: { padding: themeUtils.get('SPACING.MD') } },
    React.createElement('h3', {
      style: {
        marginBottom: themeUtils.get('SPACING.LG'),
        textAlign: 'center'
      }
    }, 'Applications'),
    React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: themeUtils.get('SPACING.MD')
      }
    }, appCards)
  );
};

export default AppLauncherPanel;
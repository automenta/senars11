/**
 * App Launcher Panel - Shows application selection options
 * Extracted from MergedLauncher for docking framework integration
 */

import React from 'react';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';
import { UI_APPS } from '../constants/uiApps.js';

const AppLauncherPanel = () => {
  const handleAppSelect = (app) => {
    // Redirect to the selected application
    if (app.id === 'minimal-repl') {
      window.location.href = '/repl/#minimal';
    } else {
      window.location.href = app.path;
    }
  };

  const cardStyle = React.useMemo(() => ({
    cursor: 'pointer',
    transform: 'scale(1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderLeft: `4px solid ${themeUtils.get('COLORS.PRIMARY')}`,
    ':hover': {
      transform: 'scale(1.02)',
      boxShadow: themeUtils.get('SHADOWS.MD')
    }
  }), []);

  const contentStyle = React.useMemo(() => ({
    display: 'flex',
    alignItems: 'center'
  }), []);

  const iconStyle = React.useMemo(() => ({
    fontSize: '1.5rem',
    marginRight: '0.5rem'
  }), []);

  const descriptionStyle = React.useMemo(() => ({
    marginBottom: themeUtils.get('SPACING.MD')
  }), []);

  return React.createElement('div', { style: { padding: themeUtils.get('SPACING.MD') } },
    React.createElement('h3', { style: { marginBottom: themeUtils.get('SPACING.LG'), textAlign: 'center' } }, 'Applications'),
    React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: themeUtils.get('SPACING.MD')
      }
    },
      UI_APPS.filter(app => app.id !== 'merged').map(app =>
        React.createElement('div', {
          key: app.id,
          style: cardStyle,
          onClick: () => handleAppSelect(app),
          onMouseEnter: (e) => e.target.style.transform = 'scale(1.02)',
          onMouseLeave: (e) => e.target.style.transform = 'scale(1)'
        },
          React.createElement(Card, {
            title: React.createElement('div', { style: contentStyle },
              React.createElement('span', { style: iconStyle }, app.icon),
              app.name
            )
          },
            React.createElement('p', { style: descriptionStyle }, app.description),
            React.createElement(Button, {
              variant: 'light',
              size: 'sm',
              onClick: (e) => {
                e.stopPropagation();
                handleAppSelect(app);
              }
            }, 'Launch')
          )
        )
      )
    )
  );
};

export default AppLauncherPanel;
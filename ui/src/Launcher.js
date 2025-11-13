import React from 'react';
import { BaseApp } from './components/BaseApp.js';
import { Button, Card } from './components/GenericComponents.js';
import { themeUtils } from './utils/themeUtils.js';

/**
 * UI Application definitions with metadata
 */
const UI_APPS = Object.freeze([
  {
    id: 'ide',
    name: 'Cognitive IDE',
    description: 'Main IDE interface with flexible layout panels',
    icon: '🧠',
    color: themeUtils.get('COLORS.PRIMARY'),
    path: '/'
  },
  {
    id: 'repl',
    name: 'REPL Interface',
    description: 'Read-Eval-Print Loop for direct NARS interaction',
    icon: '💻',
    color: themeUtils.get('COLORS.SECONDARY'),
    path: '/repl/'
  },
  {
    id: 'simple',
    name: 'Simple UI Collection',
    description: 'Minimal interfaces for focused tasks',
    icon: '⚡',
    color: themeUtils.get('COLORS.SUCCESS'),
    path: '/simple-uis/'
  },
  {
    id: 'graph',
    name: 'Graph UI',
    description: 'Visual representation of concepts and relationships',
    icon: '🌐',
    color: themeUtils.get('COLORS.WARNING'),
    path: '/?layout=graph'
  },
  {
    id: 'selfAnalysis',
    name: 'Self Analysis',
    description: 'System introspection and monitoring tools',
    icon: '🔍',
    color: themeUtils.get('COLORS.DANGER'),
    path: '/?layout=self-analysis'
  }
]);

/**
 * Application card component using React.createElement
 */
const AppCard = ({ app, onClick }) => {
  const cardStyle = React.useMemo(() => ({
    cursor: 'pointer',
    transform: 'scale(1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderLeft: `4px solid ${app.color}`,
    ':hover': {
      transform: 'scale(1.02)',
      boxShadow: themeUtils.get('SHADOWS.MD')
    }
  }), [app.color]);

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

  const handleCardClick = React.useCallback(() => onClick(app), [onClick, app]);

  const handleLaunchClick = React.useCallback((e) => {
    e.stopPropagation();
    onClick(app);
  }, [onClick, app]);

  return React.createElement('div', {
    style: cardStyle,
    onClick: handleCardClick,
    onMouseEnter: (e) => e.target.style.transform = 'scale(1.02)',
    onMouseLeave: (e) => e.target.style.transform = 'scale(1)',
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
    onClick: handleLaunchClick
  }, 'Launch')
  )
  );
};

/**
 * Launcher: Main launcher component with proper loading and error handling
 */
const Launcher = ({ appId = 'launcher', appConfig = {} }) => {
  // Function to handle app selection
  const handleAppSelect = React.useCallback((app) => {
    // Redirect to the selected application
    window.location.href = app.path;
  }, []);

  const LauncherContent = () => React.createElement('div', { style: { padding: themeUtils.get('SPACING.LG'), textAlign: 'center' } },
    React.createElement('h2', { style: { marginBottom: themeUtils.get('SPACING.XL') } },
      'Select an Interface to Begin'
    ),
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: themeUtils.get('SPACING.MD'),
        maxWidth: '1200px',
        margin: '0 auto'
      }
    },
    UI_APPS.map(app =>
      React.createElement(AppCard, {
        key: app.id,
        app: app,
        onClick: handleAppSelect
      })
    )
    )
  );

  return React.createElement(BaseApp, {
    appId,
    appConfig: { title: 'SeNARS Web UI Launcher', ...appConfig },
    showWebSocketStatus: false,
    layoutComponent: LauncherContent
  });
};

export default Launcher;
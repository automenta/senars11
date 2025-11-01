/**
 * Panel utilities for creating consistent, reusable panel components
 * Implements elegant architectural patterns for panel creation
 */

import React from 'react';
import Panel from '../components/Panel.js';
import ErrorBoundary from '../components/ErrorBoundary.js';
import { themeUtils } from './themeUtils.js';

/**
 * Create a standardized panel with common patterns
 */
const createStandardPanel = ({
  title,
  children,
  wsServiceRequired = true,
  showWebSocketStatus = true,
  showHeader = true,
  className = '',
  style = {},
  headerExtra = null,
  fallbackMessage = 'Unable to display content',
  onRenderError = null
}) => {
  return React.createElement(Panel, {
    title,
    showWebSocketStatus,
    showHeader,
    className,
    style,
    headerExtra
  }, React.createElement(ErrorBoundary, {
    fallback: React.createElement('div', {
      style: {
        padding: '1rem',
        color: themeUtils.get('TEXT.MUTED'),
        fontStyle: 'italic'
      }
    }, fallbackMessage),
    onError: onRenderError
  }, children));
};

/**
 * Create a data-driven panel that displays list-based content
 */
const createListPanel = ({
  title,
  data,
  renderItem,
  emptyMessage = 'No items to display',
  emptyIcon = '🔍',
  isLoading = false,
  error = null,
  ...panelProps
}) => {
  if (error) {
    return createStandardPanel({
      ...panelProps,
      title,
      children: React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          color: themeUtils.get('COLORS.DANGER')
        }
      },
      React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem' }}, '❌'),
      React.createElement('div', null, error.message || 'An error occurred')
      )
    });
  }

  if (isLoading) {
    return createStandardPanel({
      ...panelProps,
      title,
      children: React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }
      },
      React.createElement('div', {
        style: {
          width: '1.5rem',
          height: '1.5rem',
          border: `2px solid ${themeUtils.get('COLORS.PRIMARY')}40`, // 25% opacity
          borderTop: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }
      })
      )
    });
  }

  if (!data || data.length === 0) {
    return createStandardPanel({
      ...panelProps,
      title,
      children: React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          color: themeUtils.get('TEXT.MUTED'),
          textAlign: 'center'
        }
      },
      React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem' }}, emptyIcon),
      React.createElement('div', null, emptyMessage)
      )
    });
  }

  return createStandardPanel({
    ...panelProps,
    title,
    children: React.createElement('div', { style: { width: '100%' } },
      ...data.map((item, index) => renderItem(item, index))
    )
  });
};

/**
 * Create a data visualization panel
 */
const createVisualizationPanel = ({
  title,
  data,
  renderVisualization,
  emptyMessage = 'No data to visualize',
  ...panelProps
}) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return createStandardPanel({
      ...panelProps,
      title,
      children: React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          color: themeUtils.get('TEXT.MUTED'),
          textAlign: 'center'
        }
      },
      React.createElement('div', { style: { fontSize: '2rem', marginBottom: '0.5rem' }}, '📊'),
      React.createElement('div', null, emptyMessage)
      )
    });
  }

  return createStandardPanel({
    ...panelProps,
    title,
    children: renderVisualization(data)
  });
};

/**
 * Create a configuration/settings panel
 */
const createConfigPanel = ({
  title,
  configItems,
  renderConfigItem,
  onSave,
  onCancel,
  ...panelProps
}) => {
  return createStandardPanel({
    ...panelProps,
    title,
    children: React.createElement('div', null,
      // Config items
      React.createElement('div', { style: { marginBottom: '1rem' } },
        ...configItems.map((item, index) => 
          renderConfigItem(item, index)
        )
      ),
      // Action buttons
      React.createElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '0.5rem',
          borderTop: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
          paddingTop: '1rem'
        } 
      },
      React.createElement('button', {
        onClick: onCancel,
        style: {
          padding: '0.5rem 1rem',
          backgroundColor: themeUtils.get('COLORS.SECONDARY'),
          color: themeUtils.get('TEXT.LIGHT'),
          border: 'none',
          borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
          cursor: 'pointer'
        }
      }, 'Cancel'),
      React.createElement('button', {
        onClick: onSave,
        style: {
          padding: '0.5rem 1rem',
          backgroundColor: themeUtils.get('COLORS.PRIMARY'),
          color: themeUtils.get('TEXT.LIGHT'),
          border: 'none',
          borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
          cursor: 'pointer'
        }
      }, 'Save')
      )
    )
  });
};

export {
  createStandardPanel,
  createListPanel,
  createVisualizationPanel,
  createConfigPanel
};

export default {
  createStandardPanel,
  createListPanel,
  createVisualizationPanel,
  createConfigPanel
};
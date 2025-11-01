// Common UI constants and styling utilities
import React from 'react';

/**
 * Common UI constants and styling utilities
 */

// Common styling constants
export const UI_CONSTANTS = {
  COLORS: {
    PRIMARY: '#3498db',
    SUCCESS: '#2ecc71',
    WARNING: '#f39c12',
    DANGER: '#e74c3c',
    INFO: '#3498db',
    DARK: '#2c3e50',
    LIGHT: '#ecf0f1'
  },
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem'
  },
  BREAKPOINTS: {
    MOBILE: '768px',
    TABLET: '1024px',
    DESKTOP: '1200px'
  }
};

// Common React components
export const Components = {
  /**
   * Loading spinner component
   */
  LoadingSpinner: ({ size = '1.5rem', color = UI_CONSTANTS.COLORS.PRIMARY, ...props }) => {
    return React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: UI_CONSTANTS.SPACING.MD,
        ...props.style
      }
    },
    React.createElement('div', {
      style: {
        width: size,
        height: size,
        border: `2px solid ${color}40`, // 25% opacity
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        ...props.spinnerStyle
      }
    })
    );
  },

  /**
   * Empty state component
   */
  EmptyState: ({ message = 'No data to display', icon = '🔍', ...props }) => {
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: UI_CONSTANTS.SPACING.LG,
        textAlign: 'center',
        color: '#999',
        ...props.style
      }
    },
    React.createElement('div', { style: { fontSize: '2rem', marginBottom: UI_CONSTANTS.SPACING.MD }}, icon),
    React.createElement('div', null, message)
    );
  },

  /**
   * Error state component
   */
  ErrorState: ({ message = 'An error occurred', onRetry = null, ...props }) => {
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: UI_CONSTANTS.SPACING.LG,
        textAlign: 'center',
        color: UI_CONSTANTS.COLORS.DANGER,
        ...props.style
      }
    },
    React.createElement('div', { style: { fontSize: '2rem', marginBottom: UI_CONSTANTS.SPACING.MD }}, '❌'),
    React.createElement('div', null, message),
    onRetry && React.createElement('button', {
      onClick: onRetry,
      style: {
        marginTop: UI_CONSTANTS.SPACING.MD,
        padding: `${UI_CONSTANTS.SPACING.XS} ${UI_CONSTANTS.SPACING.SM}`,
        backgroundColor: UI_CONSTANTS.COLORS.DANGER,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }
    }, 'Retry')
    );
  },

  /**
   * Status badge component
   */
  StatusBadge: ({ status, label, ...props }) => {
    const statusConfig = {
      success: { color: UI_CONSTANTS.COLORS.SUCCESS, bg: UI_CONSTANTS.COLORS.SUCCESS + '20' },
      warning: { color: UI_CONSTANTS.COLORS.WARNING, bg: UI_CONSTANTS.COLORS.WARNING + '20' },
      error: { color: UI_CONSTANTS.COLORS.DANGER, bg: UI_CONSTANTS.COLORS.DANGER + '20' },
      info: { color: UI_CONSTANTS.COLORS.INFO, bg: UI_CONSTANTS.COLORS.INFO + '20' },
      default: { color: '#666', bg: '#f0f0f0' }
    };
    
    const config = statusConfig[status] || statusConfig.default;
    
    return React.createElement('span', {
      style: {
        padding: '0.125rem 0.5rem',
        borderRadius: '12px',
        backgroundColor: config.bg,
        color: config.color,
        fontSize: '0.75rem',
        fontWeight: 'normal',
        ...props.style
      }
    }, label || status);
  }
};
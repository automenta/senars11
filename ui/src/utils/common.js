// Common UI utilities and constants
import React from 'react';

/**
 * Common UI utilities, constants, and helper functions
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

// Common utility functions
export const Utils = {
  /**
   * Format a date in a human-readable way
   */
  formatDate: (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  },

  /**
   * Format a timestamp as time ago
   */
  formatTimeAgo: (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  },

  /**
   * Truncate text to a specified length
   */
  truncateText: (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  },

  /**
   * Generate a unique ID
   */
  generateId: () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Deep clone an object
   */
  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),

  /**
   * Get a nested property from an object using dot notation
   */
  getNestedProperty: (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  },

  /**
   * Debounce a function
   */
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle a function
   */
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
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
        padding: `0.125rem 0.5rem`,
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

// Common formatting functions
export const Formatters = {
  /**
   * Format a number with thousands separators
   */
  formatNumber: (num) => {
    if (num === null || num === undefined) return '';
    return new Intl.NumberFormat().format(num);
  },

  /**
   * Format a number as a percentage
   */
  formatPercentage: (num, decimals = 2) => {
    if (num === null || num === undefined) return '';
    return `${(num * 100).toFixed(decimals)}%`;
  },

  /**
   * Format bytes to human-readable format
   */
  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
};

// Export all utilities
export default {
  UI_CONSTANTS,
  Utils,
  Components,
  Formatters
};
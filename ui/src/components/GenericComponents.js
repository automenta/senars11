import React, { memo } from 'react';
import { format } from 'date-fns';
import useUiStore from '../stores/uiStore.js';
import { themeUtils } from '../utils/themeUtils.js';

/**
 * Generic status badge component
 * @param {string} status - Status type (success, warning, error, info, etc.)
 * @param {string} label - Display label for the status
 * @param {Object} props - Additional props
 */
const StatusBadge = memo(({ status, label, ...props }) => {
  const statusConfig = {
    success: { color: themeUtils.get('COLORS.SUCCESS'), bg: themeUtils.get('COLORS.SUCCESS') + '20' },
    warning: { color: themeUtils.get('COLORS.WARNING'), bg: themeUtils.get('COLORS.WARNING') + '20' },
    error: { color: themeUtils.get('COLORS.DANGER'), bg: themeUtils.get('COLORS.DANGER') + '20' },
    info: { color: themeUtils.get('COLORS.INFO'), bg: themeUtils.get('COLORS.INFO') + '20' },
    default: { color: themeUtils.get('COLORS.SECONDARY'), bg: themeUtils.get('COLORS.GRAY_200') }
  };
  
  const { color, bg } = statusConfig[status] || statusConfig.default;
  
  return React.createElement('span', {
    style: {
      padding: '0.125rem 0.5rem',
      borderRadius: '12px',
      backgroundColor: bg,
      color: color,
      fontSize: '0.75rem',
      fontWeight: 'normal',
      ...props.style
    }
  }, label || status);
});

/**
 * Generic loading spinner component
 * @param {string} size - Size of the spinner
 * @param {string} color - Color of the spinner
 * @param {Object} props - Additional props
 */
const LoadingSpinner = memo(({ size = '1.5rem', color = '#3498db', ...props }) => {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
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
});

/**
 * Generic empty state component
 * @param {string} message - Message to display
 * @param {string} icon - Icon to show
 * @param {Object} props - Additional props
 */
const EmptyState = memo(({ message = 'No data to display', icon = '🔍', ...props }) => {
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      textAlign: 'center',
      color: '#999',
      ...props.style
    }
  },
  React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' }}, icon),
  React.createElement('div', null, message)
  );
});

/**
 * Generic error state component
 * @param {string} message - Error message to display
 * @param {Function} onRetry - Callback function to retry
 * @param {Object} props - Additional props
 */
const ErrorState = memo(({ message = 'An error occurred', onRetry = null, ...props }) => {
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      textAlign: 'center',
      color: '#dc3545',
      ...props.style
    }
  },
  React.createElement('div', { style: { fontSize: '2rem', marginBottom: '1rem' }}, '❌'),
  React.createElement('div', null, message),
  onRetry && React.createElement('button', {
    onClick: onRetry,
    style: {
      marginTop: '1rem',
      padding: '0.25rem 0.5rem',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }
  }, 'Retry')
  );
});

/**
 * Generic time display component with relative time formatting
 * @param {number} timestamp - Unix timestamp
 * @param {Object} props - Additional props
 */
const TimeDisplay = memo(({ timestamp, formatType = 'relative', ...props }) => {
  if (!timestamp) return React.createElement('span', null, '-');
  
  const date = new Date(timestamp);
  
  if (formatType === 'relative') {
    // Calculate relative time
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return React.createElement('span', null, `${diffInSeconds}s ago`);
    if (diffInSeconds < 3600) return React.createElement('span', null, `${Math.floor(diffInSeconds / 60)}m ago`);
    if (diffInSeconds < 86400) return React.createElement('span', null, `${Math.floor(diffInSeconds / 3600)}h ago`);
    return React.createElement('span', null, `${Math.floor(diffInSeconds / 86400)}d ago`);
  } else if (formatType === 'datetime') {
    return React.createElement('span', null, format(date, 'MM/dd/yyyy HH:mm:ss'));
  } else {
    return React.createElement('span', null, format(date, 'HH:mm:ss'));
  }
});

/**
 * WebSocket status indicator component
 * @param {Object} props - Component props
 */
const WebSocketStatus = memo(({ showLabel = true, ...props }) => {
  const wsConnected = useUiStore(state => state.wsConnected);
  
  return React.createElement('div', { 
    className: 'websocket-status',
    style: { 
      display: 'flex', 
      alignItems: 'center', 
      ...props.style 
    }
  },
  React.createElement('div', {
    style: {
      width: '0.75rem',
      height: '0.75rem',
      borderRadius: '50%',
      backgroundColor: themeUtils.getWebSocketStatusColor(wsConnected),
      marginRight: '0.5rem'
    }
  }),
  showLabel && React.createElement('span', null, wsConnected ? 'Connected' : 'Disconnected')
  );
});

export {
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  ErrorState,
  TimeDisplay,
  WebSocketStatus
};
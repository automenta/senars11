import React, { memo, useState } from 'react';
import { format } from 'date-fns';
import useUiStore from '../stores/uiStore.js';
import { themeUtils } from '../utils/themeUtils.js';

// Status badge configuration using centralized theme
const getStatusConfig = (status) => {
  const statusConfig = {
    success: { color: themeUtils.get('COLORS.SUCCESS'), bg: themeUtils.get('COLORS.SUCCESS') + '20' },
    warning: { color: themeUtils.get('COLORS.WARNING'), bg: themeUtils.get('COLORS.WARNING') + '20' },
    error: { color: themeUtils.get('COLORS.DANGER'), bg: themeUtils.get('COLORS.DANGER') + '20' },
    info: { color: themeUtils.get('COLORS.INFO'), bg: themeUtils.get('COLORS.INFO') + '20' },
    default: { color: themeUtils.get('COLORS.SECONDARY'), bg: themeUtils.get('COLORS.GRAY_200') }
  };
  
  return statusConfig[status] || statusConfig.default;
};

/**
 * Generic status badge component
 * @param {string} status - Status type (success, warning, error, info, etc.)
 * @param {string} label - Display label for the status
 * @param {Object} props - Additional props
 */
const StatusBadge = memo(({ status, label, ...props }) => {
  const { color, bg } = getStatusConfig(status);
  
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

// Generic form field component to reduce duplication in forms
const GenericFormField = ({ 
  label, 
  children, 
  required = false, 
  description = null,
  style = {} 
}) => {
  return React.createElement('div', { 
    style: { 
      marginBottom: '1rem', 
      ...style 
    } 
  },
    React.createElement('label', {
      style: {
        display: 'block',
        fontWeight: 'bold',
        marginBottom: '0.25rem',
        fontSize: '0.9rem',
        color: '#333'
      }
    }, 
      label,
      required && React.createElement('span', { style: { color: 'red' } }, ' *')
    ),
    children,
    description && React.createElement('div', {
      style: {
        fontSize: '0.8rem',
        color: '#666',
        marginTop: '0.25rem'
      }
    }, description)
  );
};

// Generic input field component that combines label and input
const GenericInputField = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder = '', 
  required = false,
  description = null,
  disabled = false 
}) => {
  return React.createElement(GenericFormField, { label, required, description },
    React.createElement('input', {
      type,
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      disabled,
      required,
      style: {
        width: '100%',
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '0.9rem'
      }
    })
  );
};

// Generic select field component that combines label and select
const GenericSelectField = ({ 
  label, 
  value, 
  onChange, 
  options, 
  required = false,
  description = null,
  disabled = false 
}) => {
  return React.createElement(GenericFormField, { label, required, description },
    React.createElement('select', {
      value,
      onChange: (e) => onChange(e.target.value),
      disabled,
      style: {
        width: '100%',
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '0.9rem'
      }
    },
      options.map(option => 
        React.createElement('option', { key: option.value, value: option.value }, option.label)
      )
    )
  );
};

// Collapsible section component
const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return React.createElement('div', {
    style: {
      border: '1px solid #e9ecef',
      borderRadius: '4px',
      marginBottom: '1rem'
    }
  },
    React.createElement('div', {
      style: {
        padding: '0.75rem',
        backgroundColor: '#f8f9fa',
        borderBottom: isOpen ? '1px solid #e9ecef' : 'none',
        cursor: 'pointer',
        fontWeight: 'bold'
      },
      onClick: () => setIsOpen(!isOpen)
    },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement('span', null, title),
        React.createElement('span', null, isOpen ? '▼' : '▶')
      )
    ),
    isOpen && React.createElement('div', { style: { padding: '1rem' } }, children)
  );
};

// Toggle switch component
const ToggleSwitch = ({ checked, onChange, label }) => {
  return React.createElement('label', {
    style: {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      fontSize: '0.9rem'
    }
  },
    React.createElement('div', {
      style: {
        position: 'relative',
        width: '40px',
        height: '20px',
        backgroundColor: checked ? '#007bff' : '#ccc',
        borderRadius: '10px',
        marginRight: '0.5rem',
        transition: 'background-color 0.3s'
      }
    },
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          width: '16px',
          height: '16px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transition: 'left 0.3s'
        }
      })
    ),
    label
  );
};

// Button variant styling configuration
const getButtonVariantStyle = (variant) => {
  const variantStyles = {
    primary: { backgroundColor: '#007bff', color: 'white' },
    secondary: { backgroundColor: '#6c757d', color: 'white' },
    success: { backgroundColor: '#28a745', color: 'white' },
    warning: { backgroundColor: '#ffc107', color: '#212529' },
    danger: { backgroundColor: '#dc3545', color: 'white' },
    light: { backgroundColor: '#f8f9fa', color: '#212529', border: '1px solid #ced4da' },
    dark: { backgroundColor: '#343a40', color: 'white' }
  };

  return variantStyles[variant] || variantStyles.primary;
};

// Generic Button component
const Button = ({ children, onClick, variant = 'primary', style = {}, disabled = false }) => {
  const baseStyle = {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontSize: '0.9rem',
    fontWeight: 'normal'
  };

  return React.createElement('button', {
    style: {
      ...baseStyle,
      ...getButtonVariantStyle(variant),
      ...style
    },
    onClick,
    disabled
  }, children);
};

// Generic Card component
const Card = ({ children, title, style = {} }) => {
  return React.createElement('div', {
    style: {
      border: '1px solid #e9ecef',
      borderRadius: '4px',
      padding: '1rem',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      ...style
    }
  }, 
    title && React.createElement('div', {
      style: {
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid #e9ecef'
      }
    }, title),
    children
  );
};

export {
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  ErrorState,
  TimeDisplay,
  WebSocketStatus,
  GenericFormField,
  GenericInputField,
  GenericSelectField,
  CollapsibleSection,
  ToggleSwitch,
  Button,
  Card
};
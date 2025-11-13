import React, {memo, useState} from 'react';
import {format} from 'date-fns';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';
import {createControlBar, createContainer, createHeader} from '../utils/componentUtils.js';

// Helper function to get status configuration using ternary operator
const getStatusConfig = (status) => {
  const configs = {
    success: {color: themeUtils.get('COLORS.SUCCESS'), bg: themeUtils.get('COLORS.SUCCESS') + '20'},
    warning: {color: themeUtils.get('COLORS.WARNING'), bg: themeUtils.get('COLORS.WARNING') + '20'},
    error: {color: themeUtils.get('COLORS.DANGER'), bg: themeUtils.get('COLORS.DANGER') + '20'},
    info: {color: themeUtils.get('COLORS.INFO'), bg: themeUtils.get('COLORS.INFO') + '20'},
    default: {color: themeUtils.get('COLORS.SECONDARY'), bg: themeUtils.get('COLORS.GRAY_200')}
  };
  return configs[status] ?? configs.default;
};

// StatusBadge: Clean, parameterized component
const StatusBadge = memo(({status = 'default', label, ...props}) => {
  const {color, bg} = getStatusConfig(status);

  const badgeStyle = {
    padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
    borderRadius: '12px',
    backgroundColor: bg,
    color,
    fontSize: themeUtils.get('FONTS.SIZE.XS'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
    display: 'inline-block',
    ...props.style
  };

  return React.createElement('span', {style: badgeStyle}, label ?? status);
});

// LoadingSpinner: Parameterized with default values
const LoadingSpinner = memo(({size = themeUtils.get('SPACING.XL'), color = themeUtils.get('COLORS.PRIMARY'), ...props}) => {
  const spinnerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.MD'),
    ...props.style
  };

  const spinnerInnerStyle = {
    width: size,
    height: size,
    border: `2px solid ${color}40`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    ...props.spinnerStyle
  };

  return React.createElement('div', {style: spinnerStyle},
    React.createElement('div', {style: spinnerInnerStyle})
  );
});

// EmptyState: Default message and icon with flexibility
const EmptyState = memo(({message = 'No data to display', icon = '🔍', ...props}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.LG'),
    textAlign: 'center',
    color: themeUtils.get('TEXT.MUTED'),
    ...props.style
  };

  const iconStyle = {
    fontSize: '2rem',
    marginBottom: themeUtils.get('SPACING.MD')
  };

  return React.createElement('div', {style: containerStyle},
    React.createElement('div', {style: iconStyle}, icon),
    React.createElement('div', null, message)
  );
});

// ErrorState: Error handling with retry option
const ErrorState = memo(({message = 'An error occurred', onRetry, ...props}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.LG'),
    textAlign: 'center',
    color: themeUtils.get('COLORS.DANGER'),
    ...props.style
  };

  const iconStyle = {
    fontSize: '2rem',
    marginBottom: themeUtils.get('SPACING.MD')
  };

  return React.createElement('div', {style: containerStyle},
    React.createElement('div', {style: iconStyle}, '❌'),
    React.createElement('div', null, message),
    onRetry && React.createElement(Button, {
      onClick: onRetry,
      variant: 'danger',
      style: {marginTop: themeUtils.get('SPACING.SM')}
    }, 'Retry')
  );
});

// TimeDisplay: Calculate and format time efficiently
const TimeDisplay = memo(({timestamp, formatType = 'relative', ...props}) => {
  if (!timestamp) return React.createElement('span', {style: props.style}, '-');

  const date = new Date(timestamp);
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  const displayText = formatType === 'relative'
    ? diffInSeconds < 60
      ? `${diffInSeconds}s ago`
      : diffInSeconds < 3600
        ? `${Math.floor(diffInSeconds / 60)}m ago`
        : diffInSeconds < 86400
          ? `${Math.floor(diffInSeconds / 3600)}h ago`
          : `${Math.floor(diffInSeconds / 86400)}d ago`
    : formatType === 'datetime'
      ? format(date, 'MM/dd/yyyy HH:mm:ss')
      : format(date, 'HH:mm:ss');

  return React.createElement('span', {style: props.style}, displayText);
});

// WebSocketStatus: Component for showing connection status
const WebSocketStatus = memo(({showLabel = true, ...props}) => {
  const wsConnected = useUiStore(state => state.wsConnected);

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    ...props.style
  };

  const indicatorStyle = {
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '50%',
    backgroundColor: themeUtils.getWebSocketStatusColor(wsConnected),
    marginRight: themeUtils.get('SPACING.SM')
  };

  return React.createElement('div', {className: 'websocket-status', style: containerStyle},
    React.createElement('div', {style: indicatorStyle}),
    showLabel && React.createElement('span', null, wsConnected ? 'Connected' : 'Disconnected')
  );
});

// Generic Form Field Container
const GenericFormField = memo(({label, children, required = false, description, style = {}}) => {
  const containerStyle = {
    marginBottom: themeUtils.get('SPACING.MD'),
    ...style
  };

  const labelStyle = {
    display: 'block',
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: themeUtils.get('SPACING.XS'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.PRIMARY')
  };

  const requiredStyle = {
    color: themeUtils.get('COLORS.DANGER')
  };

  const descriptionStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    marginTop: themeUtils.get('SPACING.XS')
  };

  return React.createElement('div', {style: containerStyle},
    React.createElement('label', {style: labelStyle},
      label,
      required && React.createElement('span', {style: requiredStyle}, ' *')
    ),
    children,
    description && React.createElement('div', {style: descriptionStyle}, description)
  );
});

// Generic Input Field with consistent styling
const GenericInputField = memo(({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  description,
  disabled = false,
  ...props
}) => {
  const inputStyle = {
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box'
  };

  return React.createElement(GenericFormField, {label, required, description},
    React.createElement('input', {
      type,
      value,
      onChange: (e) => onChange?.(e.target.value),
      placeholder,
      disabled,
      required,
      style: inputStyle,
      ...props
    })
  );
});

// Generic Select Field with consistent styling
const GenericSelectField = memo(({
  label,
  value,
  onChange,
  options = [],
  required = false,
  description,
  disabled = false,
  ...props
}) => {
  const selectStyle = {
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box'
  };

  return React.createElement(GenericFormField, {label, required, description},
    React.createElement('select', {
      value,
      onChange: (e) => onChange?.(e.target.value),
      disabled,
      style: selectStyle,
      ...props
    },
    options.map((option) =>
      React.createElement('option', {key: option.value, value: option.value}, option.label)
    )
    )
  );
});

// Collapsible Section Component
const CollapsibleSection = memo(({title, children, defaultOpen = false, ...props}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const containerStyle = {
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    marginBottom: themeUtils.get('SPACING.MD'),
    ...props.style
  };

  const headerStyle = {
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    borderBottom: isOpen ? `1px solid ${themeUtils.get('BORDERS.COLOR')}` : 'none',
    cursor: 'pointer',
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
  };

  const contentStyle = {
    padding: themeUtils.get('SPACING.MD')
  };

  const flexContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return React.createElement('div', {style: containerStyle},
    React.createElement('div', {style: headerStyle, onClick: () => setIsOpen(!isOpen)},
      React.createElement('div', {style: flexContainerStyle},
        React.createElement('span', null, title),
        React.createElement('span', null, isOpen ? '▼' : '▶')
      )
    ),
    isOpen && React.createElement('div', {style: contentStyle}, children)
  );
});

// Toggle Switch Component
const ToggleSwitch = memo(({checked, onChange, label}) => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: themeUtils.get('FONTS.SIZE.SM')
  };

  const switchStyle = {
    position: 'relative',
    width: '40px',
    height: '20px',
    backgroundColor: checked ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('COLORS.GRAY_400'),
    borderRadius: '10px',
    marginRight: themeUtils.get('SPACING.SM'),
    transition: 'background-color 0.3s'
  };

  const thumbStyle = {
    position: 'absolute',
    top: '2px',
    left: checked ? '22px' : '2px',
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'left 0.3s'
  };

  return React.createElement('label', {style: containerStyle},
    React.createElement('div', {style: switchStyle},
      React.createElement('div', {style: thumbStyle})
    ),
    label
  );
});

// Button component with variants
const getButtonVariantStyle = (variant) => {
  const variants = {
    primary: {backgroundColor: themeUtils.get('COLORS.PRIMARY'), color: themeUtils.get('TEXT.LIGHT')},
    secondary: {backgroundColor: themeUtils.get('COLORS.SECONDARY'), color: themeUtils.get('TEXT.LIGHT')},
    success: {backgroundColor: themeUtils.get('COLORS.SUCCESS'), color: themeUtils.get('TEXT.LIGHT')},
    warning: {backgroundColor: themeUtils.get('COLORS.WARNING'), color: themeUtils.get('TEXT.PRIMARY')},
    danger: {backgroundColor: themeUtils.get('COLORS.DANGER'), color: themeUtils.get('TEXT.LIGHT')},
    light: {
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      color: themeUtils.get('TEXT.PRIMARY'),
      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
    },
    dark: {backgroundColor: themeUtils.get('COLORS.DARK'), color: themeUtils.get('TEXT.LIGHT')}
  };
  return variants[variant] ?? variants.primary;
};

// Size styles for buttons
const buttonSizeStyles = {
  sm: {padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`, fontSize: themeUtils.get('FONTS.SIZE.SM')},
  md: {padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`, fontSize: themeUtils.get('FONTS.SIZE.SM')},
  lg: {padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.LG')}`, fontSize: themeUtils.get('FONTS.SIZE.BASE')}
};

const Button = memo(({children, onClick, variant = 'primary', style = {}, disabled = false, size = 'md', ...props}) => {
  const baseStyle = {
    border: 'none',
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
    ...buttonSizeStyles[size]
  };

  return React.createElement('button', {
    style: {...baseStyle, ...getButtonVariantStyle(variant), ...style},
    onClick,
    disabled,
    ...props
  }, children);
});

// Card Component
const Card = memo(({children, title, style = {}, ...props}) => {
  const cardStyle = {
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: themeUtils.get('SPACING.MD'),
    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
    boxShadow: themeUtils.get('SHADOWS.SM'),
    ...style
  };

  const titleStyle = {
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: themeUtils.get('SPACING.SM'),
    paddingBottom: themeUtils.get('SPACING.SM'),
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    color: themeUtils.get('TEXT.PRIMARY')
  };

  return React.createElement('div', {style: cardStyle, ...props},
    title && React.createElement('div', {style: titleStyle}, title),
    children
  );
});

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
import React, { memo, useState, useMemo } from 'react';
import { format } from 'date-fns';
import useUiStore from '../stores/uiStore.js';
import { themeUtils } from '../utils/themeUtils.js';
import { createControlBar, createContainer, createHeader } from '../utils/componentUtils.js';

// ====== SHARED UTILITIES ======

/**
 * Button component with variants and sizes
 */
const getButtonVariantStyle = (variant) => {
  const variants = Object.freeze({
    primary: { backgroundColor: themeUtils.get('COLORS.PRIMARY'), color: themeUtils.get('TEXT.LIGHT') },
    secondary: { backgroundColor: themeUtils.get('COLORS.SECONDARY'), color: themeUtils.get('TEXT.LIGHT') },
    success: { backgroundColor: themeUtils.get('COLORS.SUCCESS'), color: themeUtils.get('TEXT.LIGHT') },
    warning: { backgroundColor: themeUtils.get('COLORS.WARNING'), color: themeUtils.get('TEXT.PRIMARY') },
    danger: { backgroundColor: themeUtils.get('COLORS.DANGER'), color: themeUtils.get('TEXT.LIGHT') },
    light: {
      backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
      color: themeUtils.get('TEXT.PRIMARY'),
      border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
    },
    dark: { backgroundColor: themeUtils.get('COLORS.DARK'), color: themeUtils.get('TEXT.LIGHT') }
  });
  return variants[variant] ?? variants.primary;
};

const buttonSizeStyles = Object.freeze({
  sm: { padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`, fontSize: themeUtils.get('FONTS.SIZE.SM') },
  md: { padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`, fontSize: themeUtils.get('FONTS.SIZE.SM') },
  lg: { padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.LG')}`, fontSize: themeUtils.get('FONTS.SIZE.BASE') }
});

const Button = memo(({ children, onClick, variant = 'primary', style = {}, disabled = false, size = 'md', ...props }) => {
  const buttonStyle = useMemo(() => {
    const baseStyle = {
      border: 'none',
      borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
      ...buttonSizeStyles[size],
      ...getButtonVariantStyle(variant),
      ...style
    };
    return baseStyle;
  }, [disabled, size, variant, style]);

  return React.createElement('button', {
    style: buttonStyle,
    onClick,
    disabled,
    ...props
  }, children);
});

/**
 * StatusBadge: Clean, parameterized component
 */
const STATUS_CONFIGS = Object.freeze({
  success: { color: themeUtils.get('COLORS.SUCCESS'), bg: themeUtils.get('COLORS.SUCCESS') + '20' },
  warning: { color: themeUtils.get('COLORS.WARNING'), bg: themeUtils.get('COLORS.WARNING') + '20' },
  error: { color: themeUtils.get('COLORS.DANGER'), bg: themeUtils.get('COLORS.DANGER') + '20' },
  info: { color: themeUtils.get('COLORS.INFO'), bg: themeUtils.get('COLORS.INFO') + '20' },
  default: { color: themeUtils.get('COLORS.SECONDARY'), bg: themeUtils.get('COLORS.GRAY_200') }
});

const StatusBadge = memo(({ status = 'default', label, style = {} }) => {
  const config = STATUS_CONFIGS[status] ?? STATUS_CONFIGS.default;

  const badgeStyle = useMemo(() => ({
    padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
    borderRadius: '12px',
    backgroundColor: config.bg,
    color: config.color,
    fontSize: themeUtils.get('FONTS.SIZE.XS'),
    fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
    display: 'inline-block',
    ...style
  }), [config.bg, config.color, style]);

  return React.createElement('span', { style: badgeStyle }, label ?? status);
});

/**
 * LoadingSpinner: Parameterized with default values
 */
const LoadingSpinner = memo(({ size = themeUtils.get('SPACING.XL'), color = themeUtils.get('COLORS.PRIMARY'), style = {}, spinnerStyle = {} }) => {
  const computedStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.MD'),
    ...style
  }), [style]);

  const computedSpinnerStyle = useMemo(() => ({
    width: size,
    height: size,
    border: `2px solid ${color}40`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    ...spinnerStyle
  }), [size, color, spinnerStyle]);

  return React.createElement('div', { style: computedStyle },
    React.createElement('div', { style: computedSpinnerStyle })
  );
});

/**
 * EmptyState: Default message and icon with flexibility
 */
const EmptyState = memo(({ message = 'No data to display', icon = '🔍', ...props }) => {
  const containerStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.LG'),
    textAlign: 'center',
    color: themeUtils.get('TEXT.MUTED'),
    ...props.style
  }), [props.style]);

  const iconStyle = useMemo(() => ({
    fontSize: '2rem',
    marginBottom: themeUtils.get('SPACING.MD')
  }), []);

  return React.createElement('div', { style: containerStyle },
    React.createElement('div', { style: iconStyle }, icon),
    React.createElement('div', null, message)
  );
});

/**
 * ErrorState: Error handling with retry option
 */
const ErrorState = memo(({ message = 'An error occurred', onRetry, ...props }) => {
  const containerStyle = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.LG'),
    textAlign: 'center',
    color: themeUtils.get('COLORS.DANGER'),
    ...props.style
  }), [props.style]);

  const iconStyle = useMemo(() => ({
    fontSize: '2rem',
    marginBottom: themeUtils.get('SPACING.MD')
  }), []);

  return React.createElement('div', { style: containerStyle },
    React.createElement('div', { style: iconStyle }, '❌'),
    React.createElement('div', null, message),
    onRetry && React.createElement(Button, {
      onClick: onRetry,
      variant: 'danger',
      style: { marginTop: themeUtils.get('SPACING.SM') }
    }, 'Retry')
  );
});

/**
 * TimeDisplay: Calculate and format time efficiently
 */
const TimeDisplay = memo(({ timestamp, formatType = 'relative', ...props }) => {
  if (!timestamp) return React.createElement('span', { style: props.style }, '-');

  const displayText = useMemo(() => {
    if (!timestamp) return '-';

    const date = new Date(timestamp);
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    return formatType === 'relative'
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
  }, [timestamp, formatType]);

  return React.createElement('span', { style: props.style }, displayText);
});

/**
 * WebSocketStatus: Component for showing connection status
 */
const WebSocketStatus = memo(({ showLabel = true, ...props }) => {
  const wsConnected = useUiStore(state => state.wsConnected);

  const containerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    ...props.style
  }), [props.style]);

  const indicatorStyle = useMemo(() => ({
    width: '0.75rem',
    height: '0.75rem',
    borderRadius: '50%',
    backgroundColor: themeUtils.getWebSocketStatusColor(wsConnected),
    marginRight: themeUtils.get('SPACING.SM')
  }), [wsConnected]);

  return React.createElement('div', { className: 'websocket-status', style: containerStyle },
    React.createElement('div', { style: indicatorStyle }),
    showLabel && React.createElement('span', null, wsConnected ? 'Connected' : 'Disconnected')
  );
});

/**
 * Generic Form Field Container
 */
const GenericFormField = memo(({ label, children, required = false, description, style = {} }) => {
  const containerStyle = useMemo(() => ({
    marginBottom: themeUtils.get('SPACING.MD'),
    ...style
  }), [style]);

  const labelStyle = useMemo(() => ({
    display: 'block',
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: themeUtils.get('SPACING.XS'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.PRIMARY')
  }), []);

  const requiredStyle = useMemo(() => ({
    color: themeUtils.get('COLORS.DANGER')
  }), []);

  const descriptionStyle = useMemo(() => ({
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    marginTop: themeUtils.get('SPACING.XS')
  }), []);

  return React.createElement('div', { style: containerStyle },
    React.createElement('label', { style: labelStyle },
      label,
      required && React.createElement('span', { style: requiredStyle }, ' *')
    ),
    children,
    description && React.createElement('div', { style: descriptionStyle }, description)
  );
});

/**
 * Generic Input Field with consistent styling
 */
const GenericInputField = memo(({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  description,
  disabled = false,
  style = {},
  ...props
}) => {
  const inputStyle = useMemo(() => ({
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box',
    ...style
  }), [disabled, style]);

  return React.createElement(GenericFormField, { label, required, description },
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

/**
 * Generic Select Field with consistent styling
 */
const GenericSelectField = memo(({
  label,
  value,
  onChange,
  options = [],
  required = false,
  description,
  disabled = false,
  style = {},
  ...props
}) => {
  const selectStyle = useMemo(() => ({
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box',
    ...style
  }), [disabled, style]);

  return React.createElement(GenericFormField, { label, required, description },
    React.createElement('select', {
      value,
      onChange: (e) => onChange?.(e.target.value),
      disabled,
      style: selectStyle,
      ...props
    },
    options.map((option) =>
      React.createElement('option', { key: option.value, value: option.value }, option.label)
    )
    )
  );
});

/**
 * Collapsible Section Component
 */
const CollapsibleSection = memo(({ title, children, defaultOpen = false, ...props }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const containerStyle = useMemo(() => ({
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    marginBottom: themeUtils.get('SPACING.MD'),
    ...props.style
  }), [props.style]);

  const headerStyle = useMemo(() => ({
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    borderBottom: isOpen ? `1px solid ${themeUtils.get('BORDERS.COLOR')}` : 'none',
    cursor: 'pointer',
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
  }), [isOpen]);

  const contentStyle = useMemo(() => ({
    padding: themeUtils.get('SPACING.MD')
  }), []);

  const flexContainerStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }), []);

  return React.createElement('div', { style: containerStyle },
    React.createElement('div', { style: headerStyle, onClick: () => setIsOpen(!isOpen) },
      React.createElement('div', { style: flexContainerStyle },
        React.createElement('span', null, title),
        React.createElement('span', null, isOpen ? '▼' : '▶')
      )
    ),
    isOpen && React.createElement('div', { style: contentStyle }, children)
  );
});

/**
 * Toggle Switch Component
 */
const ToggleSwitch = memo(({ checked, onChange, label }) => {
  const containerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: themeUtils.get('FONTS.SIZE.SM')
  }), []);

  const switchStyle = useMemo(() => ({
    position: 'relative',
    width: '40px',
    height: '20px',
    backgroundColor: checked ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('COLORS.GRAY_400'),
    borderRadius: '10px',
    marginRight: themeUtils.get('SPACING.SM'),
    transition: 'background-color 0.3s'
  }), [checked]);

  const thumbStyle = useMemo(() => ({
    position: 'absolute',
    top: '2px',
    left: checked ? '22px' : '2px',
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'left 0.3s'
  }), [checked]);

  return React.createElement('label', { style: containerStyle },
    React.createElement('div', { style: switchStyle },
      React.createElement('div', { style: thumbStyle })
    ),
    label
  );
});

/**
 * Card Component
 */
const Card = memo(({ children, title, style = {}, ...props }) => {
  const cardStyle = useMemo(() => ({
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    padding: themeUtils.get('SPACING.MD'),
    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
    boxShadow: themeUtils.get('SHADOWS.SM'),
    ...style
  }), [style]);

  const titleStyle = useMemo(() => ({
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: themeUtils.get('SPACING.SM'),
    paddingBottom: themeUtils.get('SPACING.SM'),
    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    color: themeUtils.get('TEXT.PRIMARY')
  }), []);

  return React.createElement('div', { style: cardStyle, ...props },
    title && React.createElement('div', { style: titleStyle }, title),
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
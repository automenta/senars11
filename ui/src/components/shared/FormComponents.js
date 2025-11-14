import React, { memo } from 'react';
import { themeUtils } from '../../utils/themeUtils.js';

// Generic Form Field Container
export const GenericFormField = memo(({
  label,
  children,
  required = false,
  description,
  error,
  style = {},
  labelStyle = {},
  ...props
}) => {
  const containerStyle = {
    marginBottom: themeUtils.get('SPACING.MD'),
    ...style
  };

  const labelContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    marginBottom: themeUtils.get('SPACING.XS'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.PRIMARY'),
    ...labelStyle
  };

  const requiredStyle = {
    color: themeUtils.get('COLORS.DANGER')
  };

  const descriptionStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('TEXT.SECONDARY'),
    marginTop: themeUtils.get('SPACING.XS')
  };

  const errorStyle = {
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    color: themeUtils.get('COLORS.DANGER'),
    marginTop: themeUtils.get('SPACING.XS')
  };

  const allContent = React.createElement('div', { style: { display: 'contents' } },
    React.createElement('div', { style: labelContainerStyle },
      React.createElement('span', null, label),
      required && React.createElement('span', { style: requiredStyle }, ' *')
    ),
    React.createElement('div', { style: { display: 'contents' } }, children),
    description && React.createElement('div', { style: descriptionStyle }, description),
    error && React.createElement('div', { style: errorStyle }, error)
  );

  return React.createElement('div', { style: containerStyle, ...props }, allContent);
});

// Generic Input Field with consistent styling
export const GenericInputField = memo(({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  description,
  disabled = false,
  error,
  ...props
}) => {
  const inputStyle = {
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${error ? themeUtils.get('COLORS.DANGER') : themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box'
  };

  return React.createElement(GenericFormField, { label, required, description, error },
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
export const GenericSelectField = memo(({
  label,
  value,
  onChange,
  options = [],
  required = false,
  description,
  disabled = false,
  error,
  ...props
}) => {
  const selectStyle = {
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${error ? themeUtils.get('COLORS.DANGER') : themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box'
  };

  return React.createElement(GenericFormField, { label, required, description, error },
    React.createElement('select', {
      value,
      onChange: (e) => onChange?.(e.target.value),
      disabled,
      style: selectStyle,
      ...props
    }, 
      ...options.map((option) => 
        React.createElement('option', { key: option.value, value: option.value }, option.label)
      )
    )
  );
});

// Generic Textarea Field
export const GenericTextAreaField = memo(({
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  description,
  disabled = false,
  rows = 4,
  error,
  ...props
}) => {
  const textareaStyle = {
    width: '100%',
    padding: themeUtils.get('SPACING.SM'),
    border: `1px solid ${error ? themeUtils.get('COLORS.DANGER') : themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
    color: themeUtils.get('TEXT.PRIMARY'),
    boxSizing: 'border-box',
    resize: 'vertical'
  };

  return React.createElement(GenericFormField, { label, required, description, error },
    React.createElement('textarea', {
      value,
      onChange: (e) => onChange?.(e.target.value),
      placeholder,
      disabled,
      required,
      rows,
      style: textareaStyle,
      ...props
    })
  );
});

// Toggle Switch Component
export const ToggleSwitch = memo(({
  checked,
  onChange,
  label,
  disabled = false,
  ...props
}) => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: themeUtils.get('FONTS.SIZE.SM'),
    opacity: disabled ? 0.6 : 1
  };

  const switchStyle = {
    position: 'relative',
    width: '40px',
    height: '20px',
    backgroundColor: checked ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('COLORS.GRAY_400'),
    borderRadius: '10px',
    marginRight: themeUtils.get('SPACING.SM'),
    transition: 'background-color 0.3s',
    cursor: disabled ? 'not-allowed' : 'pointer'
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

  const handleClick = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  return React.createElement('label', {
    style: containerStyle,
    onClick: handleClick,
    ...props
  },
    React.createElement('div', { style: switchStyle },
      React.createElement('div', { style: thumbStyle })
    ),
    label
  );
});

// Collapsible Section Component - This component requires state, which can't be done with pure React.createElement
// We'll keep it simple and remove the state management from the component
export const CollapsibleSection = memo(({
  title,
  children,
  isOpen: controlledIsOpen,
  onToggle,
  defaultOpen = false,
  style = {},
  headerStyle = {},
  contentStyle = {},
  ...props
}) => {
  // If no external control provided, we'll ignore the collapse functionality
  // This is a compromise to maintain React.createElement compatibility
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : defaultOpen;

  const containerStyle = {
    border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
    marginBottom: themeUtils.get('SPACING.MD'),
    ...style
  };

  const headerStyleMerged = {
    padding: themeUtils.get('SPACING.SM'),
    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
    borderBottom: isOpen ? `1px solid ${themeUtils.get('BORDERS.COLOR')}` : 'none',
    cursor: 'pointer',
    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
    ...headerStyle
  };

  const contentStyleMerged = {
    padding: themeUtils.get('SPACING.MD'),
    ...contentStyle
  };

  const flexContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const handleHeaderClick = () => {
    if (onToggle) {
      onToggle();
    }
  };

  return React.createElement('div', { style: containerStyle, ...props },
    React.createElement('div', { style: headerStyleMerged, onClick: handleHeaderClick },
      React.createElement('div', { style: flexContainerStyle },
        React.createElement('span', null, title),
        React.createElement('span', null, isOpen ? '▼' : '▶')
      )
    ),
    isOpen && React.createElement('div', { style: contentStyleMerged }, children)
  );
});
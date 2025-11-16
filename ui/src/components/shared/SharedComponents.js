/**
 * Shared component architecture with common loading/error states
 * Following PLAN.ui.md: Create shared component architecture with proper loading/error states
 */

import React from 'react';
import {LoadingSpinner} from './LoadingSpinner.js';
import {themeUtils} from '../../utils/themeUtils.js';

/**
 * BaseComponent: Component with common loading/error states
 */
export const BaseComponent = ({
                                  loading = false,
                                  error = null,
                                  children,
                                  loadingMessage = 'Loading...',
                                  errorMessage = 'An error occurred',
                                  className = '',
                                  style = {}
                              }) => {
    if (loading) {
        return React.createElement(
            'div',
            {
                className: `base-component-loading ${className}`,
                style: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '200px',
                    ...style
                }
            },
            React.createElement(LoadingSpinner, {
                size: themeUtils.get('SPACING.XL'),
                message: loadingMessage
            })
        );
    }

    if (error) {
        return React.createElement(
            'div',
            {
                className: `base-component-error ${className}`,
                style: {
                    padding: themeUtils.get('SPACING.MD'),
                    backgroundColor: themeUtils.get('COLORS.DANGER') + '20',
                    color: themeUtils.get('COLORS.DANGER'),
                    border: `1px solid ${themeUtils.get('COLORS.DANGER')}`,
                    borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                    ...style
                }
            },
            React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, 'Error:'),
            React.createElement('div', null, error.message || errorMessage)
        );
    }

    return React.createElement(
        'div',
        {
            className: `base-component ${className}`,
            style
        },
        children
    );
};

/**
 * DataDisplay: Component for showing various data types (tasks, concepts, beliefs)
 */
export const DataDisplay = ({data, dataType = 'generic', emptyMessage = 'No data available', renderItem = null}) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return React.createElement(
            'div',
            {
                style: {
                    padding: themeUtils.get('SPACING.MD'),
                    textAlign: 'center',
                    color: themeUtils.get('TEXT.SECONDARY'),
                    fontStyle: 'italic'
                }
            },
            emptyMessage
        );
    }

    if (Array.isArray(data)) {
        return React.createElement(
            'div',
            {style: {padding: themeUtils.get('SPACING.SM')}},
            data.map((item, index) => {
                if (renderItem && typeof renderItem === 'function') {
                    return renderItem(item, index);
                }
                return React.createElement(
                    'div',
                    {
                        key: item.id || item.term || index,
                        style: {
                            padding: themeUtils.get('SPACING.SM'),
                            borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                            display: 'flex',
                            justifyContent: 'space-between'
                        }
                    },
                    React.createElement('span', null, JSON.stringify(item))
                );
            })
        );
    }

    return React.createElement(
        'div',
        {style: {padding: themeUtils.get('SPACING.SM')}},
        React.createElement('pre', null, JSON.stringify(data, null, 2))
    );
};

/**
 * InputComponent: Component for Narsese input with validation
 */
export const InputComponent = ({
                                   value = '',
                                   onChange,
                                   onSubmit,
                                   placeholder = 'Enter input...',
                                   disabled = false,
                                   validation = null,
                                   showValidation = true
                               }) => {
    const [inputValue, setInputValue] = React.useState(value);
    const [validationResult, setValidationResult] = React.useState(null);

    React.useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        if (validation && typeof validation === 'function') {
            const result = validation(newValue);
            setValidationResult(result);
        }

        if (onChange) {
            onChange(newValue);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit && !disabled) {
            onSubmit(inputValue);
        }
    };

    const isValid = validationResult?.isValid !== false;
    const validationMessage = validationResult?.message;

    return React.createElement(
        'div',
        {style: {display: 'flex', flexDirection: 'column'}},
        React.createElement(
            'form',
            {
                onSubmit: handleSubmit,
                style: {display: 'flex', gap: themeUtils.get('SPACING.SM')}
            },
            React.createElement(
                'input',
                {
                    type: 'text',
                    value: inputValue,
                    onChange: handleChange,
                    placeholder,
                    disabled,
                    style: {
                        flex: 1,
                        padding: themeUtils.get('SPACING.SM'),
                        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                        backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.DISABLED') : themeUtils.get('BACKGROUNDS.PRIMARY'),
                        ...(!isValid && showValidation ? {border: `1px solid ${themeUtils.get('COLORS.DANGER')}`} : {})
                    }
                }
            ),
            React.createElement(
                'button',
                {
                    type: 'submit',
                    disabled: disabled || (validationResult && !isValid),
                    style: {
                        padding: themeUtils.get('SPACING.SM'),
                        backgroundColor: themeUtils.get('COLORS.PRIMARY'),
                        color: 'white',
                        border: 'none',
                        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                        cursor: 'pointer'
                    }
                },
                'Submit'
            )
        ),
        showValidation && validationResult && !isValid && React.createElement(
            'div',
            {
                style: {
                    marginTop: themeUtils.get('SPACING.XS'),
                    color: themeUtils.get('COLORS.DANGER'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM')
                }
            },
            validationMessage
        )
    );
};

/**
 * StatusIndicator: Component for WebSocket and system status
 */
export const StatusIndicator = ({
                                    connected = false,
                                    statusText = '',
                                    showActivityIndicator = true,
                                    style = {}
                                }) => {
    const statusColor = connected ? themeUtils.get('COLORS.SUCCESS') : themeUtils.get('COLORS.WARNING');
    const statusBgColor = connected ? themeUtils.get('COLORS.SUCCESS') + '20' : themeUtils.get('COLORS.WARNING') + '20';

    return React.createElement(
        'div',
        {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: themeUtils.get('SPACING.SM'),
                padding: themeUtils.get('SPACING.SM'),
                backgroundColor: statusBgColor,
                borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                border: `1px solid ${statusColor}`,
                ...style
            }
        },
        showActivityIndicator && React.createElement(
            'div',
            {
                style: {
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: statusColor
                }
            }
        ),
        React.createElement(
            'span',
            {
                style: {
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                    color: statusColor
                }
            },
            connected ? 'Connected' : 'Disconnected'
        ),
        statusText && React.createElement(
            'span',
            {
                style: {
                    color: themeUtils.get('TEXT.SECONDARY'),
                    fontSize: themeUtils.get('FONTS.SIZE.SM')
                }
            },
            ` - ${statusText}`
        )
    );
};

export default {
    BaseComponent,
    DataDisplay,
    InputComponent,
    StatusIndicator
};

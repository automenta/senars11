/**
 * Enhanced Error Boundaries with Recovery Mechanisms
 * Following PLAN.ui.md: Eliminate fatal errors through architectural safeguards
 */

import React from 'react';
import {themeUtils} from '../utils/themeUtils.js';
import useUiStore from '../stores/uiStore.js';

// Enhanced global error boundary with recovery
class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            shouldAttemptRecovery: true
        };
    }

    static getDerivedStateFromError(error) {
        return {hasError: true, error};
    }

    componentDidCatch(error, errorInfo) {
        this.setState({errorInfo});

        // Log error to monitoring system
        console.error('GlobalErrorBoundary caught error:', error, errorInfo);

        // Add to UI store for centralized error tracking
        useUiStore.getState().setError({
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
            componentStack: errorInfo.componentStack
        });

        // Report to error tracking service if available
        if (window.sentry || window.rollbar) {
            (window.sentry || window.rollbar).captureException(error, {
                contexts: {react: {componentStack: errorInfo.componentStack}}
            });
        }
    }

    handleRecovery = () => {
        // Attempt recovery by resetting state and clearing error
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        // Reset UI store to safe state
        useUiStore.getState().resetStore();

        // Trigger UI refresh
        if (this.props.onRecovery) {
            this.props.onRecovery();
        }
    };

    render() {
        if (this.state.hasError) {
            return React.createElement(ErrorFallbackComponent, {
                error: this.state.error,
                errorInfo: this.state.errorInfo,
                onRecovery: this.handleRecovery,
                onReset: () => window.location.reload()
            });
        }

        return this.props.children;
    }
}

// Fallback component with multiple recovery options
const ErrorFallbackComponent = ({error, errorInfo, onRecovery, onReset}) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const [attemptingRecovery, setAttemptingRecovery] = React.useState(false);

    const handleSafeRecovery = async () => {
        setAttemptingRecovery(true);

        try {
            // Try to reconnect WebSocket service
            const wsService = useUiStore.getState().wsService;
            if (wsService) {
                wsService.disconnect();
                await new Promise(resolve => setTimeout(resolve, 1000));
                wsService.connect();
            }

            // Reset UI store to safe state
            useUiStore.getState().resetStore();

            // Attempt recovery
            onRecovery?.();
        } catch (recoverError) {
            console.error('Recovery failed:', recoverError);
            // If recovery fails, force reset
            onReset?.();
        } finally {
            setAttemptingRecovery(false);
        }
    };

    return React.createElement(
        'div',
        {
            style: {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                zIndex: 9999,
                padding: themeUtils.get('SPACING.LG')
            }
        },
        React.createElement(
            'div',
            {
                style: {
                    maxWidth: '800px',
                    width: '100%',
                    backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
                    borderRadius: themeUtils.get('BORDERS.RADIUS.LG'),
                    boxShadow: themeUtils.get('SHADOWS.LG'),
                    padding: themeUtils.get('SPACING.XL'),
                    border: `2px solid ${themeUtils.get('COLORS.DANGER')}`
                }
            },
            React.createElement(
                'h2',
                {
                    style: {
                        color: themeUtils.get('COLORS.DANGER'),
                        margin: 0,
                        marginBottom: themeUtils.get('SPACING.MD')
                    }
                },
                'Application Error'
            ),
            React.createElement(
                'p',
                {
                    style: {
                        color: themeUtils.get('TEXT.PRIMARY'),
                        marginBottom: themeUtils.get('SPACING.MD')
                    }
                },
                'An unexpected error occurred. The application has been paused to prevent data loss.'
            ),
            React.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        gap: themeUtils.get('SPACING.SM'),
                        marginBottom: themeUtils.get('SPACING.MD')
                    }
                },
                React.createElement(
                    'button',
                    {
                        onClick: handleSafeRecovery,
                        disabled: attemptingRecovery,
                        style: {
                            padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
                            backgroundColor: themeUtils.get('COLORS.WARNING'),
                            color: 'white',
                            border: 'none',
                            borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                            cursor: 'pointer',
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
                        }
                    },
                    attemptingRecovery ? 'Recovering...' : 'Attempt Recovery'
                ),
                React.createElement(
                    'button',
                    {
                        onClick: onReset,
                        style: {
                            padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
                            backgroundColor: themeUtils.get('COLORS.DANGER'),
                            color: 'white',
                            border: 'none',
                            borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                            cursor: 'pointer',
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
                        }
                    },
                    'Reload Application'
                ),
                React.createElement(
                    'button',
                    {
                        onClick: () => setShowDetails(!showDetails),
                        style: {
                            padding: `${themeUtils.get('SPACING.SM')} ${themeUtils.get('SPACING.MD')}`,
                            backgroundColor: themeUtils.get('COLORS.INFO'),
                            color: 'white',
                            border: 'none',
                            borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                            cursor: 'pointer'
                        }
                    },
                    showDetails ? 'Hide Details' : 'Show Details'
                )
            ),
            showDetails && React.createElement(
                'div',
                {
                    style: {
                        backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                        padding: themeUtils.get('SPACING.MD'),
                        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                        fontFamily: 'monospace',
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        maxHeight: '200px',
                        overflow: 'auto'
                    }
                },
                React.createElement('div', null, `Error: ${error?.message}`),
                React.createElement('div', null, `Stack: ${error?.stack}`)
            )
        )
    );
};

// Component-specific error boundary
class ComponentErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error) {
        return {hasError: true, error};
    }

    componentDidCatch(error, errorInfo) {
        console.error('ComponentErrorBoundary caught error:', error, errorInfo);

        // Add to UI store without disrupting entire app
        useUiStore.getState().addNotification({
            type: 'error',
            title: 'Component Error',
            message: error.message,
            timestamp: Date.now()
        });
    }

    render() {
        if (this.state.hasError) {
            return React.createElement(
                'div',
                {
                    style: {
                        padding: themeUtils.get('SPACING.MD'),
                        backgroundColor: themeUtils.get('COLORS.DANGER') + '10',
                        border: `1px solid ${themeUtils.get('COLORS.DANGER')}`,
                        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                        color: themeUtils.get('COLORS.DANGER')
                    }
                },
                React.createElement('div', {style: {fontWeight: 'bold'}}, 'Component Error'),
                React.createElement('div', null, this.state.error?.message),
                React.createElement(
                    'button',
                    {
                        onClick: () => this.setState({hasError: false, error: null}),
                        style: {
                            marginTop: themeUtils.get('SPACING.SM'),
                            padding: `${themeUtils.get('SPACING.XS')} ${themeUtils.get('SPACING.SM')}`,
                            backgroundColor: themeUtils.get('COLORS.WARNING'),
                            color: 'white',
                            border: 'none',
                            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                            cursor: 'pointer'
                        }
                    },
                    'Reset Component'
                )
            );
        }

        return this.props.children;
    }
}

// Safe component wrapper that handles errors gracefully
const SafeComponent = ({component: Component, fallback = null, ...props}) => {
    return React.createElement(ComponentErrorBoundary, null,
        React.createElement(Component, props)
    );
};

// Export enhanced error handling system
export {
    GlobalErrorBoundary,
    ComponentErrorBoundary,
    SafeComponent,
    ErrorFallbackComponent
};

// Enhanced error reporting utility
export const errorUtils = {
    // Safe function execution with error handling
    safeExecute: async (fn, fallbackValue = null, onError = null) => {
        try {
            return await fn();
        } catch (error) {
            console.error('Safe execution error:', error);
            if (onError) onError(error);
            return fallbackValue;
        }
    },

    // Async operation with automatic retry
    retryOperation: async (operation, maxRetries = 3, delay = 1000) => {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                }
            }
        }

        throw lastError;
    },

    // Validate and sanitize data before processing
    validateAndSanitize: (data, schema, sanitizers = {}) => {
        try {
            // Apply sanitizers
            let sanitizedData = {...data};
            for (const [field, sanitizer] of Object.entries(sanitizers)) {
                if (sanitizedData[field] !== undefined) {
                    sanitizedData[field] = sanitizer(sanitizedData[field]);
                }
            }

            // Validate against schema (simplified)
            if (schema && typeof schema === 'function') {
                return schema(sanitizedData) ? sanitizedData : null;
            }

            return sanitizedData;
        } catch (error) {
            console.error('Validation error:', error);
            return null;
        }
    }
};
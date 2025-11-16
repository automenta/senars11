/**
 * Enhanced Root Level Error Boundary
 * Provides comprehensive error handling for the entire application
 * Following AGENTS.md: Elegant, Consolidated, Consistent, Organized, DRY
 */
import React from 'react';
import useUiStore from '../stores/uiStore.js';
import {Button, Card} from './GenericComponents.js';
import {themeUtils} from '../utils/themeUtils.js';

class RootErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            showDetails: false,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            windowLocation: typeof window !== 'undefined' ? window.location.href : ''
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return {hasError: true};
    }

    componentDidCatch(error, errorInfo) {
        // Generate a unique error ID for tracking
        const errorId = `root-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.setState({
            error,
            errorInfo,
            errorId
        });

        // Store error in global state with additional context
        const errorData = {
            id: errorId,
            message: error.message,
            name: error.name,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: Date.now(),
            component: this.props.componentName || 'RootApp',
            userAgent: this.state.userAgent,
            location: this.state.windowLocation
        };

        useUiStore.getState().setError(errorData);

        // Log error for debugging
        console.error('Root Error Boundary caught an error:', error, errorInfo);

        // Report error to logging service if available
        this.reportError(errorData);
    }

    /**
     * Report error to external logging service
     */
    reportError = (errorData) => {
        // This could be integrated with a logging service like Sentry, LogRocket, etc.
        // For now, we'll just log to console
        console.group('Error Report');
        console.log('Error ID:', errorData.id);
        console.log('Error Name:', errorData.name);
        console.log('Error Message:', errorData.message);
        console.log('Component Stack:', errorData.componentStack);
        console.log('Timestamp:', new Date(errorData.timestamp).toISOString());
        console.log('User Agent:', errorData.userAgent);
        console.log('Location:', errorData.location);
        console.groupEnd();
    };

    handleRetry = () => {
        // Reset the component state to retry rendering
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            showDetails: false
        });

        // Clear global error state
        useUiStore.getState().clearError();

        // Force a re-render by updating the window location hash
        if (typeof window !== 'undefined') {
            window.location.hash = '#retry';
            window.location.hash = '';
        }
    };

    handleReload = () => {
        // Reload the entire page
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    toggleDetails = () => {
        this.setState(prevState => ({
            showDetails: !prevState.showDetails
        }));
    };

    copyErrorDetails = () => {
        const errorDetails = `
Error ID: ${this.state.errorId}
Error Name: ${this.state.error?.name}
Error Message: ${this.state.error?.message}
Component Stack: ${this.state.errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
User Agent: ${this.state.userAgent}
Location: ${this.state.windowLocation}
    `.trim();

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(errorDetails);
            // Add a notification about the copy
            useUiStore.getState().addNotification({
                type: 'info',
                title: 'Error details copied',
                message: 'Copied error details to clipboard'
            });
        }
    };

    render() {
        if (this.state.hasError) {
            return React.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        width: '100vw',
                        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                        padding: themeUtils.get('SPACING.LG'),
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        zIndex: 9999,
                        overflow: 'auto'
                    }
                },
                React.createElement(Card, {
                        style: {
                            width: '100%',
                            maxWidth: '800px',
                            border: `2px solid ${themeUtils.get('COLORS.DANGER')}`,
                            backgroundColor: themeUtils.get('COLORS.DANGER') + '10',
                            margin: 'auto',
                            boxShadow: themeUtils.get('SHADOWS.LG')
                        }
                    },
                    React.createElement('h2', {
                            style: {
                                color: themeUtils.get('COLORS.DANGER'),
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }
                        },
                        React.createElement('span', {style: {display: 'flex', alignItems: 'center'}},
                            React.createElement('span', {style: {marginRight: themeUtils.get('SPACING.SM')}}, '⚠️'),
                            'Critical Application Error'
                        )
                    ),

                    this.state.errorId && React.createElement('div', {
                            style: {
                                fontSize: themeUtils.get('FONTS.SIZE.SM'),
                                color: themeUtils.get('TEXT.SECONDARY'),
                                marginBottom: themeUtils.get('SPACING.MD'),
                                fontFamily: 'monospace',
                                padding: themeUtils.get('SPACING.SM'),
                                backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
                                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }
                        },
                        React.createElement('span', null, `Error ID: ${this.state.errorId}`),
                        React.createElement(Button, {
                            onClick: this.copyErrorDetails,
                            variant: 'secondary',
                            size: 'sm',
                            style: {marginLeft: themeUtils.get('SPACING.SM')}
                        }, 'Copy Details')
                    ),

                    this.state.error && React.createElement('div', {
                            style: {
                                marginBottom: themeUtils.get('SPACING.MD'),
                                padding: themeUtils.get('SPACING.SM'),
                                backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
                                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
                            }
                        },
                        React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}},
                            this.state.error.name || 'Error'
                        ),
                        React.createElement('div', {style: {wordBreak: 'break-word'}}, this.state.error.message)
                    ),

                    React.createElement('div', {
                            style: {
                                display: 'flex',
                                gap: themeUtils.get('SPACING.SM'),
                                marginBottom: themeUtils.get('SPACING.MD')
                            }
                        },
                        React.createElement(Button, {
                            onClick: this.handleReload,
                            variant: 'danger',
                            style: {flex: 1}
                        }, 'Reload Application'),

                        React.createElement(Button, {
                            onClick: this.handleRetry,
                            variant: 'secondary',
                            style: {flex: 1}
                        }, 'Retry'),

                        React.createElement(Button, {
                            onClick: this.toggleDetails,
                            variant: 'light',
                            style: {flex: 1}
                        }, this.state.showDetails ? 'Hide Details' : 'Show Details')
                    ),

                    this.state.showDetails && this.state.errorInfo && React.createElement('details', {
                            style: {
                                marginTop: themeUtils.get('SPACING.MD'),
                                padding: themeUtils.get('SPACING.SM'),
                                backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
                                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                                maxHeight: '300px',
                                overflow: 'auto'
                            }
                        },
                        React.createElement('summary', {
                            style: {
                                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                                cursor: 'pointer',
                                padding: themeUtils.get('SPACING.XS')
                            }
                        }, 'Component Stack Trace'),
                        React.createElement('pre', {
                            style: {
                                margin: `${themeUtils.get('SPACING.SM')} 0`,
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                fontSize: themeUtils.get('FONTS.SIZE.XS'),
                                color: themeUtils.get('TEXT.MUTED'),
                                padding: themeUtils.get('SPACING.SM'),
                                backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                                borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                                overflow: 'auto'
                            }
                        }, this.state.errorInfo.componentStack)
                    ),

                    React.createElement('div', {
                            style: {
                                marginTop: themeUtils.get('SPACING.MD'),
                                paddingTop: themeUtils.get('SPACING.MD'),
                                borderTop: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                                fontSize: themeUtils.get('FONTS.SIZE.SM'),
                                color: themeUtils.get('TEXT.SECONDARY')
                            }
                        },
                        React.createElement('p', null, 'Possible causes:'),
                        React.createElement('ul', {style: {margin: 0, paddingLeft: themeUtils.get('SPACING.MD')}},
                            React.createElement('li', null, 'WebSocket connection to backend failed'),
                            React.createElement('li', null, 'Backend server not running'),
                            React.createElement('li', null, 'Layout initialization error'),
                            React.createElement('li', null, 'Dependency loading failure'),
                            React.createElement('li', null, 'Memory or resource exhaustion')
                        ),
                        React.createElement('p', {style: {marginTop: themeUtils.get('SPACING.SM')}},
                            'Try reloading the application or check your backend server connection.'
                        )
                    )
                )
            );
        }

        return this.props.children;
    }
}

export default RootErrorBoundary;
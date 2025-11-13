import React from 'react';
import { useStore } from 'zustand';
import useUiStore from '../stores/uiStore';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';

/**
 * ErrorBoundary: A component that catches JavaScript errors anywhere in the child component tree,
 * and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate a unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Store error in global state with additional context
    useUiStore.getState().setError({
      id: errorId,
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      component: this.props.componentName || 'Unknown'
    });
  }

  handleRetry = () => {
    // Clear global error state
    useUiStore.getState().clearError();
    // Reset local state to re-render children
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;

    if (hasError) {
      return React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: themeUtils.get('SPACING.LG')
          }
        },
        React.createElement(Card, {
          style: {
            width: '100%',
            maxWidth: '600px',
            border: `2px solid ${themeUtils.get('COLORS.DANGER')}`,
            backgroundColor: themeUtils.get('COLORS.DANGER') + '10'
          }
        },
        React.createElement('h3', {
          style: {
            color: themeUtils.get('COLORS.DANGER'),
            margin: 0,
            display: 'flex',
            alignItems: 'center'
          }
        },
        React.createElement('span', { style: { marginRight: themeUtils.get('SPACING.SM') } }, '⚠️'),
        'Something went wrong'
        ),

        errorId && React.createElement('div', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            color: themeUtils.get('TEXT.SECONDARY'),
            marginBottom: themeUtils.get('SPACING.MD'),
            fontFamily: 'monospace'
          }
        }, `Error ID: ${errorId}`),

        error && React.createElement('div', {
          style: {
            marginBottom: themeUtils.get('SPACING.MD'),
            padding: themeUtils.get('SPACING.SM'),
            backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
          }
        },
        React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD') } }, error.name || 'Error'),
        React.createElement('div', null, error.message)
        ),

        React.createElement('div', { style: { marginBottom: themeUtils.get('SPACING.MD') } },
          React.createElement(Button, {
            onClick: this.handleRetry,
            variant: 'danger',
            style: { marginRight: themeUtils.get('SPACING.SM') }
          }, 'Try Again'),

          this.props.onReport && React.createElement(Button, {
            onClick: () => this.props.onReport(error, errorInfo),
            variant: 'secondary'
          }, 'Report Issue')
        ),

        this.props.showErrorDetails !== false && errorInfo && React.createElement('details', {
          style: {
            marginTop: themeUtils.get('SPACING.MD'),
            padding: themeUtils.get('SPACING.SM'),
            backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
          }
        },
        React.createElement('summary', {
          style: {
            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
            cursor: 'pointer',
            padding: themeUtils.get('SPACING.XS')
          }
        }, 'Technical Details'),
        React.createElement('pre', {
          style: {
            margin: `${themeUtils.get('SPACING.SM')} 0`,
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: themeUtils.get('FONTS.SIZE.XS'),
            color: themeUtils.get('TEXT.MUTED')
          }
        }, errorInfo.componentStack)
        )
        )
      );
    }

    return this.props.children;
  }
}

/**
 * GlobalErrorDisplay: A component to display global errors from the store
 */
export const GlobalErrorDisplay = () => {
  const error = useStore(useUiStore, state => state.error);
  const clearError = useUiStore(state => state.clearError);

  if (!error) return null;

  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        maxWidth: '400px',
        width: '100%'
      }
    },
    React.createElement(Card, {
      style: {
        border: `2px solid ${themeUtils.get('COLORS.DANGER')}`,
        backgroundColor: themeUtils.get('COLORS.DANGER') + '10'
      }
    },
    React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: themeUtils.get('SPACING.SM')
      }
    },
    React.createElement('h4', {
      style: {
        margin: 0,
        color: themeUtils.get('COLORS.DANGER'),
        display: 'flex',
        alignItems: 'center'
      }
    },
    React.createElement('span', { style: { marginRight: themeUtils.get('SPACING.SM') } }, '⚠️'),
    'Global Error'
    ),
    React.createElement('button', {
      onClick: clearError,
      style: {
        background: 'none',
        border: 'none',
        fontSize: themeUtils.get('FONTS.SIZE.LG'),
        cursor: 'pointer',
        color: themeUtils.get('TEXT.PRIMARY')
      }
    }, '✕')
    ),

    error.id && React.createElement('div', {
      style: {
        fontSize: themeUtils.get('FONTS.SIZE.SM'),
        color: themeUtils.get('TEXT.SECONDARY'),
        marginBottom: themeUtils.get('SPACING.SM'),
        fontFamily: 'monospace'
      }
    }, `ID: ${error.id}`),

    React.createElement('div', {
      style: {
        marginBottom: themeUtils.get('SPACING.SM'),
        padding: themeUtils.get('SPACING.SM'),
        backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
      }
    },
    React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD') } }, error.name || 'Error'),
    React.createElement('div', null, error.message)
    ),

    error.component && React.createElement('div', {
      style: {
        fontSize: themeUtils.get('FONTS.SIZE.SM'),
        color: themeUtils.get('TEXT.SECONDARY'),
        marginBottom: themeUtils.get('SPACING.SM')
      }
    }, `Component: ${error.component}`)
    )
  );
};

export default ErrorBoundary;
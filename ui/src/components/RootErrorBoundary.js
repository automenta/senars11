/**
 * Enhanced Root Level Error Boundary
 * Provides comprehensive error handling for the entire application
 */
import React from 'react';
import useUiStore from '../stores/uiStore.js';
import { Button, Card } from './GenericComponents.js';
import { themeUtils } from '../utils/themeUtils.js';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
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
    useUiStore.getState().setError({
      id: errorId,
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      component: this.props.componentName || 'RootApp'
    });

    // Log error for debugging
    console.error('Root Error Boundary caught an error:', error, errorInfo);
  }

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
    window.location.hash = '#retry';
    window.location.hash = '';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
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
            zIndex: 9999
          }
        },
        React.createElement(Card, {
          style: {
            width: '100%',
            maxWidth: '800px',
            border: `2px solid ${themeUtils.get('COLORS.DANGER')}`,
            backgroundColor: themeUtils.get('COLORS.DANGER') + '10',
            margin: 'auto'
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
        React.createElement('span', { style: { display: 'flex', alignItems: 'center' } },
          React.createElement('span', { style: { marginRight: themeUtils.get('SPACING.SM') } }, '⚠️'),
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
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
          }
        }, `Error ID: ${this.state.errorId}`),

        this.state.error && React.createElement('div', {
          style: {
            marginBottom: themeUtils.get('SPACING.MD'),
            padding: themeUtils.get('SPACING.SM'),
            backgroundColor: themeUtils.get('BACKGROUNDS.TERTIARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
          }
        },
        React.createElement('div', { style: { fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD') } }, 
          this.state.error.name || 'Error'
        ),
        React.createElement('div', null, this.state.error.message)
        ),

        React.createElement('div', { 
          style: { 
            display: 'flex', 
            gap: themeUtils.get('SPACING.SM'),
            marginBottom: themeUtils.get('SPACING.MD') 
          } 
        },
        React.createElement(Button, {
          onClick: this.handleRetry,
          variant: 'danger',
          style: { flex: 1 }
        }, 'Reload Application'),

        React.createElement(Button, {
          onClick: this.toggleDetails,
          variant: 'secondary',
          style: { flex: 1 }
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
            color: themeUtils.get('TEXT.MUTED')
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
        React.createElement('ul', { style: { margin: 0, paddingLeft: themeUtils.get('SPACING.MD') } },
          React.createElement('li', null, 'WebSocket connection to backend failed'),
          React.createElement('li', null, 'Backend server not running'),
          React.createElement('li', null, 'Layout initialization error'),
          React.createElement('li', null, 'Dependency loading failure'),
          React.createElement('li', null, 'Memory or resource exhaustion')
        ),
        React.createElement('p', { style: { marginTop: themeUtils.get('SPACING.SM') } },
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
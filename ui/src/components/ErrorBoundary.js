import React from 'react';
import {useStore} from 'zustand';
import useUiStore from '../stores/uiStore';
import styles from './ErrorBoundary.module.css';
import {themeUtils} from '../utils/themeUtils.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null, errorInfo: null};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error, errorInfo) {
    this.setState({error, errorInfo});

    // Store error in global state
    useUiStore.getState().setError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now()
    });
  }

  handleRetry = () => {
    useUiStore.getState().clearError();
    this.setState({hasError: false, error: null, errorInfo: null});
  };

  render() {
    const {hasError} = this.state;
    if (hasError) {
      const {error, errorInfo} = this.state;
      return React.createElement(
        'div',
        {className: styles.errorBoundary},
        React.createElement('h2', null, 'Oops, something went wrong!'),
        React.createElement(
          'details',
          {style: {whiteSpace: 'pre-wrap', textAlign: 'left', margin: '10px 0'}},
          React.createElement('summary', null, 'Error details'),
          React.createElement('div', null, error?.toString()),
          React.createElement('div', null, errorInfo?.componentStack)
        ),
        React.createElement('button', {
          onClick: this.handleRetry,
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: themeUtils.get('COLORS.PRIMARY'),
            color: themeUtils.get('TEXT.LIGHT'),
            border: 'none',
            borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
            cursor: 'pointer',
            marginTop: themeUtils.get('SPACING.MD')
          }
        }, 'Try Again')
      );
    }

    return this.props.children;
  }
}

// Functional component to display global errors
export const GlobalErrorDisplay = () => {
  const error = useStore(useUiStore, state => state.error);
  const clearError = useUiStore(state => state.clearError);

  if (!error) return null;

  return React.createElement(
    'div',
    {className: styles.errorBoundary},
    React.createElement('h2', null, 'Global Error'),
    React.createElement(
      'details',
      {style: {whiteSpace: 'pre-wrap', textAlign: 'left', margin: '10px 0'}},
      React.createElement('summary', null, 'Error details'),
      React.createElement('div', null, error.message || error.toString()),
      error.stack && React.createElement('div', null, error.stack)
    ),
    React.createElement('button', {
      onClick: clearError,
      style: {
        padding: '0.5rem 1rem',
        backgroundColor: themeUtils.get('COLORS.PRIMARY'),
        color: themeUtils.get('TEXT.LIGHT'),
        border: 'none',
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        cursor: 'pointer',
        marginTop: themeUtils.get('SPACING.MD')
      }
    }, 'Dismiss')
  );
};

export default ErrorBoundary;
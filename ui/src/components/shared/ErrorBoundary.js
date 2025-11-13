/**
 * Error Boundary: Component to catch and handle errors gracefully
 * Following AGENTS.md: Error handling with context
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error with context
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Optionally send to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function' 
          ? this.props.fallback(this.state.error, this.state.errorInfo)
          : this.props.fallback;
      }
      
      return React.createElement('div', { style: { padding: '20px', color: 'red' } },
        React.createElement('h2', null, 'Something went wrong.'),
        React.createElement('details', { 
          style: { whiteSpace: 'pre-wrap' } 
        },
          React.createElement('summary', null, 'Error details'),
          React.createElement('div', null, this.state.error && this.state.error.toString()),
          React.createElement('div', null, this.state.errorInfo?.componentStack)
        )
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };

// Standalone error display component
export const GlobalErrorDisplay = () => {
  // This could be connected to a global error store if needed
  return null; // Currently a placeholder
};
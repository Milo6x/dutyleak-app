'use client'

import React from 'react';
import { ErrorFallback } from './error-fallback';
import { logReactError } from '@/lib/error-logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  variant?: 'page' | 'component' | 'dashboard';
  context?: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    logReactError(error, { componentStack: errorInfo.componentStack || '' });
    
    // Additional context logging
    if (this.props.context) {
      console.error(`ErrorBoundary context: ${this.props.context}`);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <ErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
          variant={this.props.variant || 'page'}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SearchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SearchBar Error:', error, errorInfo);
    
    // Log to analytics/monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `SearchBar Error: ${error.message}`,
        fatal: false,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="relative">
          {/* Fallback Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            
            <input
              type="text"
              disabled
              className="block w-full pl-10 pr-10 py-3 border border-red-300 rounded-lg leading-5 bg-red-50 placeholder-red-500 text-sm cursor-not-allowed"
              placeholder="Wyszukiwanie niedostępne"
            />
            
            <button
              onClick={this.handleRetry}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-red-100 rounded-r-lg transition-colors"
              title="Spróbuj ponownie"
            >
              <RefreshCw className="h-5 w-5 text-red-400 hover:text-red-600" />
            </button>
          </div>
          
          {/* Error Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Błąd wyszukiwania</p>
                <p className="text-red-600 mt-1">
                  Wystąpił problem z wyszukiwarką. Kliknij przycisk odświeżania, aby spróbować ponownie.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SearchErrorBoundary;

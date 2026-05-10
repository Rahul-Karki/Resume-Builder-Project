import React from 'react';
import { logger } from './logger';

export interface ErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  resolved: boolean;
}

export interface UserFeedback {
  errorId: string;
  feedback: 'helpful' | 'not-helpful' | 'fixed-it';
  comment?: string;
  timestamp: string;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorReport[] = [];
  private feedback: Map<string, UserFeedback[]> = new Map();
  private maxErrors = 100;
  
  private constructor() {
    this.setupErrorHandlers();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private setupErrorHandlers() {
    // Track API errors
    this.interceptFetch();
    this.interceptAxios();
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.trackApiError('fetch', args[0] as string, response.status, await response.clone().text());
        }
        return response;
      } catch (error) {
        this.trackError('API Request Failed', error, { url: args[0], method: args[1]?.method });
        throw error;
      }
    };
  }

  private interceptAxios() {
    // This will work with the axios instance in api.ts
    // We'll enhance the api.ts file later
  }

  trackError(message: string, error: Error | any, context?: Record<string, any>): string {
    const errorId = this.generateErrorId();
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message,
      stack: error?.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      resolved: false,
    };

    this.errors.push(errorReport);
    logger.error(message, { errorId, ...context, stack: error?.stack });

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Send to error service in production
    if (import.meta.env.PROD) {
      this.sendErrorToService(errorReport);
    }

    return errorId;
  }

  trackApiError(method: string, url: string, status: number, responseText?: string) {
    const message = `API ${method} ${url} failed with status ${status}`;
    this.trackError(message, new Error(message), {
      method,
      url,
      status,
      responseText: responseText?.substring(0, 500), // Limit response text size
      type: 'api_error',
    });
  }

  trackUserError(message: string, context?: Record<string, any>): string {
    return this.trackError(`User Error: ${message}`, new Error(message), {
      ...context,
      type: 'user_error',
    });
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private getUserId(): string | undefined {
    return localStorage.getItem('userId') || undefined;
  }

  private getSessionId(): string {
    return localStorage.getItem('sessionId') || 'unknown';
  }

  private async sendErrorToService(error: ErrorReport) {
    try {
      // In a real implementation, send to your error tracking service
      const errors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      errors.push(error);
      
      // Keep only last 50 errors for remote storage
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(errors));
    } catch (e) {
      logger.error('Failed to send error to service', { originalError: error, sendError: e });
    }
  }

  addFeedback(errorId: string, feedback: UserFeedback) {
    if (!this.feedback.has(errorId)) {
      this.feedback.set(errorId, []);
    }
    
    const feedbackList = this.feedback.get(errorId)!;
    feedbackList.push(feedback);
    
    // Mark error as resolved if user says they fixed it
    if (feedback.feedback === 'fixed-it') {
      const error = this.errors.find(e => e.id === errorId);
      if (error) {
        error.resolved = true;
      }
    }
    
    logger.info('Error feedback received', { errorId, feedback });
  }

  getErrors(resolved?: boolean): ErrorReport[] {
    return resolved !== undefined 
      ? this.errors.filter(e => e.resolved === resolved)
      : [...this.errors];
  }

  getError(id: string): ErrorReport | undefined {
    return this.errors.find(e => e.id === id);
  }

  getErrorFeedback(id: string): UserFeedback[] {
    return this.feedback.get(id) || [];
  }

  getErrorStats() {
    const total = this.errors.length;
    const resolved = this.errors.filter(e => e.resolved).length;
    const unresolved = total - resolved;
    
    const errorsByType = this.errors.reduce((acc, error) => {
      const type = error.context?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      resolved,
      unresolved,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      errorsByType,
    };
  }

  clearErrors() {
    this.errors = [];
    this.feedback.clear();
  }

  exportErrors(): string {
    return JSON.stringify({
      errors: this.errors,
      feedback: Object.fromEntries(this.feedback),
      stats: this.getErrorStats(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

export const errorTracker = ErrorTracker.getInstance();

// React Error Boundary
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; errorId: string }> },
  { hasError: boolean; error: Error | null; errorId: string | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error) {
    const errorId = errorTracker.trackError('React Error Boundary', error, { type: 'react_error' });
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorTracker.trackError('React Component Error', error, {
      componentStack: errorInfo.componentStack,
      type: 'react_error',
    });
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return React.createElement(FallbackComponent, {
        error: this.state.error,
        errorId: this.state.errorId,
      });
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, errorId }: { error: Error; errorId: string }) {
  return React.createElement('div', {
    style: {
      padding: '20px',
      border: '1px solid #ff6b6b',
      borderRadius: '8px',
      backgroundColor: '#ffe0e0',
      margin: '10px 0'
    }
  }, [
    React.createElement('h3', {
      key: 'title',
      style: { color: '#d63031', margin: '0 0 10px 0' }
    }, 'Something went wrong'),
    React.createElement('p', {
      key: 'error-id',
      style: { margin: '0 0 10px 0', fontSize: '14px' }
    }, [
      'Error ID: ',
      React.createElement('code', { key: 'code' }, errorId)
    ]),
    React.createElement('details', {
      key: 'details',
      style: { fontSize: '12px' }
    }, [
      React.createElement('summary', { key: 'summary' }, 'Technical details'),
      React.createElement('pre', {
        key: 'stack',
        style: {
          background: '#f8f9fa',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '200px'
        }
      }, error.stack)
    ])
  ]);
}

// Hook for error tracking
export function useErrorTracker() {
  const [errors, setErrors] = React.useState<ErrorReport[]>([]);

  React.useEffect(() => {
    const updateErrors = () => {
      setErrors(errorTracker.getErrors());
    };

    // Update errors every 5 seconds
    const interval = setInterval(updateErrors, 5000);
    updateErrors();

    return () => clearInterval(interval);
  }, []);

  const trackError = React.useCallback((message: string, error: Error | any, context?: Record<string, any>) => {
    return errorTracker.trackError(message, error, context);
  }, []);

  const addFeedback = React.useCallback((errorId: string, feedback: UserFeedback) => {
    errorTracker.addFeedback(errorId, feedback);
  }, []);

  return {
    errors,
    trackError,
    addFeedback,
    stats: errorTracker.getErrorStats(),
  };
}

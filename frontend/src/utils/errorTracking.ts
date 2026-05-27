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

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  trackError(message: string, error: Error | any, context?: Record<string, any>): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message,
      stack: error?.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || undefined,
      sessionId: localStorage.getItem('sessionId') || 'unknown',
      resolved: false,
    };

    this.errors.push(errorReport);
    logger.error(message, { errorId, ...context, stack: error?.stack });

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    if (import.meta.env.PROD) {
      try {
        const errors = JSON.parse(localStorage.getItem('errorReports') || '[]');
        errors.push(errorReport);
        if (errors.length > 50) errors.splice(0, errors.length - 50);
        localStorage.setItem('errorReports', JSON.stringify(errors));
      } catch (e) {
        logger.error('Failed to persist error report', { sendError: e });
      }
    }

    return errorId;
  }

  addFeedback(errorId: string, feedback: UserFeedback) {
    if (!this.feedback.has(errorId)) this.feedback.set(errorId, []);
    this.feedback.get(errorId)!.push(feedback);
    if (feedback.feedback === 'fixed-it') {
      const error = this.errors.find(e => e.id === errorId);
      if (error) error.resolved = true;
    }
  }

  getErrors(resolved?: boolean): ErrorReport[] {
    return resolved !== undefined
      ? this.errors.filter(e => e.resolved === resolved)
      : [...this.errors];
  }

  getErrorStats() {
    const total = this.errors.length;
    const resolved = this.errors.filter(e => e.resolved).length;
    const errorsByType = this.errors.reduce((acc, error) => {
      const type = error.context?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, resolved, unresolved: total - resolved, resolutionRate: total > 0 ? (resolved / total) * 100 : 0, errorsByType };
  }
}

export const errorTracker = ErrorTracker.getInstance();

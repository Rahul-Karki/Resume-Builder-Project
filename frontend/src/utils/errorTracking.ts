import { logger, LogEntry } from './logger';

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
  groupKey: string;
  count: number;
  breadcrumbs?: LogEntry[];
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorReport[] = [];
  private maxErrors = 100;
  private maxErrorAgeMs = 7 * 24 * 60 * 60 * 1000;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private getSessionId(): string {
    try {
      return logger.getSessionInfo().sessionId;
    } catch {
      return 'unknown';
    }
  }

  private getUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  private getBrowserInfo(): { userAgent: string; url: string } {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'ssr',
      url: typeof window !== 'undefined' ? window.location.href : 'ssr',
    };
  }

  private computeGroupKey(message: string, error: unknown): string {
    const stack = error instanceof Error ? error.stack : '';
    const firstFrame = stack?.split('\n').find(line => line.includes('at ')) || '';
    return `${message}::${firstFrame}`;
  }

  private evictOldErrors() {
    const cutoff = Date.now() - this.maxErrorAgeMs;
    this.errors = this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff);
  }

  trackError(message: string, error: unknown, context?: Record<string, any>): string {
    const groupKey = this.computeGroupKey(message, error);
    const existing = this.errors.find(e => e.groupKey === groupKey);

    if (existing) {
      existing.count++;
      existing.timestamp = new Date().toISOString();
      logger.warn(`Repeated error: ${message} (${existing.count}x)`, { groupKey, count: existing.count, ...context });
      return existing.id;
    }

    const binfo = this.getBrowserInfo();
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const stack = error instanceof Error ? error.stack : undefined;
    const breadcrumbs = logger.getRecentLogs(30);
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message,
      stack,
      context,
      userAgent: binfo.userAgent,
      url: binfo.url,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      groupKey,
      count: 1,
      breadcrumbs,
    };

    this.errors.push(errorReport);
    this.evictOldErrors();

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    logger.error(message, { errorId, groupKey, source: context?.source || 'manual', ...context, stack });

    return errorId;
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getErrorStats() {
    const total = this.errors.length;
    const errorsByType = this.errors.reduce((acc, error) => {
      const type = error.context?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, errorsByType };
  }

  initGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.onerror = (event, source, lineno, colno, error) => {
      this.trackError(
        typeof event === 'string' ? event : 'Uncaught error',
        error || new Error(String(event)),
        { source, lineno, colno, type: 'window.onerror' },
      );
    };

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.trackError(
        reason?.message || 'Unhandled promise rejection',
        reason,
        { type: 'unhandledrejection' },
      );
    });
  }
}

export const errorTracker = ErrorTracker.getInstance();
export const initErrorTracking = () => errorTracker.initGlobalHandlers();

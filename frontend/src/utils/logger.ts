export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  
  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.getUserId(),
      sessionId: this.sessionId,
    };
  }

  private getUserId(): string | undefined {
    return localStorage.getItem('userId') || undefined;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (import.meta.env.DEV) {
      const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      const style = this.getConsoleStyle(entry.level);
      console.log(
        `%c[${levelNames[entry.level]}] ${entry.timestamp} - ${entry.message}`,
        style,
        entry.context || ''
      );
    }

    // Send to remote logging service in production
    if (import.meta.env.PROD && entry.level >= LogLevel.WARN) {
      this.sendToRemoteService(entry);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'color: #888';
      case LogLevel.INFO: return 'color: #007acc';
      case LogLevel.WARN: return 'color: #ff9500; font-weight: bold';
      case LogLevel.ERROR: return 'color: #ff3333; font-weight: bold';
      default: return 'color: #000';
    }
  }

  private async sendToRemoteService(entry: LogEntry) {
    try {
      // In a real implementation, you'd send this to your logging service
      // For now, we'll just store it locally
      const remoteLogs = JSON.parse(localStorage.getItem('remoteLogs') || '[]');
      remoteLogs.push(entry);
      
      // Keep only last 100 remote logs
      if (remoteLogs.length > 100) {
        remoteLogs.splice(0, remoteLogs.length - 100);
      }
      
      localStorage.setItem('remoteLogs', JSON.stringify(remoteLogs));
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.addLog(this.formatMessage(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: Record<string, any>) {
    this.addLog(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.addLog(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, context?: Record<string, any>) {
    this.addLog(this.formatMessage(LogLevel.ERROR, message, context));
  }

  // API request logging
  logApiRequest(method: string, url: string, status?: number, duration?: number, error?: any) {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.addLog(this.formatMessage(level, `API ${method} ${url}`, {
      status,
      duration: `${duration}ms`,
      error: error?.message,
    }));
  }

  // User action logging
  logUserAction(action: string, details?: Record<string, any>) {
    this.addLog(this.formatMessage(LogLevel.INFO, `User Action: ${action}`, details));
  }

  // Performance logging
  logPerformance(metric: string, value: number, unit: string = 'ms') {
    this.addLog(this.formatMessage(LogLevel.DEBUG, `Performance: ${metric}`, {
      value,
      unit,
    }));
  }

  // Get logs for debugging
  getLogs(level?: LogLevel): LogEntry[] {
    return level ? this.logs.filter(log => log.level >= level) : [...this.logs];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.getUserId(),
      logCount: this.logs.length,
      sessionStart: new Date(parseInt(this.sessionId.split('_')[1])).toISOString(),
    };
  }
}

export const logger = Logger.getInstance();

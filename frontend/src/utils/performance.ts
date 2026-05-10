import React from 'react';
import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  context?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  
  private constructor() {
    this.initializeWebVitals();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeWebVitals() {
    // Monitor Core Web Vitals if available
    if ('web-vitals' in window) {
      // This would require installing web-vitals package
      // For now, we'll use basic Performance API
    }

    // Monitor page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.recordPageLoadMetrics();
      }, 0);
    });
  }

  private recordPageLoadMetrics() {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    const metrics = {
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      tcpConnect: timing.connectEnd - timing.connectStart,
      serverResponse: timing.responseEnd - timing.requestStart,
      domLoad: timing.domContentLoadedEventEnd - timing.navigationStart,
      fullPageLoad: timing.loadEventEnd - timing.navigationStart,
      redirectTime: timing.redirectEnd - timing.redirectStart,
      unloadTime: timing.unloadEventEnd - timing.unloadEventStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(name, value, 'ms', { type: 'page-load' });
      }
    });
  }

  recordMetric(name: string, value: number, unit: string = 'ms', context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context,
    };

    this.metrics.push(metric);
    logger.logPerformance(name, value, unit);

    // Keep only last 500 metrics
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  startTimer(name: string) {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string, context?: Record<string, any>) {
    const startTime = this.timers.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', context);
      this.timers.delete(name);
      return duration;
    }
    return 0;
  }

  // Measure API call performance
  measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then(result => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_${name}`, duration, 'ms', { ...context, success: true });
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_${name}`, duration, 'ms', { ...context, success: false, error: error.message });
        throw error;
      });
  }

  // Measure React component render time
  measureComponentRender(componentName: string) {
    return (WrappedComponent: React.ComponentType<any>) => {
      return (props: any) => {
        React.useEffect(() => {
          const startTime = performance.now();
          return () => {
            const renderTime = performance.now() - startTime;
            this.recordMetric(`component_${componentName}`, renderTime, 'ms');
          };
        }, []);
        return React.createElement(WrappedComponent, props);
      };
    };
  }

  getMetrics(name?: string): PerformanceMetric[] {
    return name ? this.metrics.filter(m => m.name.includes(name)) : [...this.metrics];
  }

  getAverageMetric(name: string): number | null {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return null;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  getMetricsSummary() {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }
      
      const stat = summary[metric.name];
      stat.count++;
      stat.min = Math.min(stat.min, metric.value);
      stat.max = Math.max(stat.max, metric.value);
    });

    // Calculate averages
    Object.keys(summary).forEach(name => {
      const metrics = this.metrics.filter(m => m.name === name);
      const sum = metrics.reduce((acc, m) => acc + m.value, 0);
      summary[name].avg = sum / metrics.length;
    });

    return summary;
  }

  clearMetrics() {
    this.metrics = [];
    this.timers.clear();
  }

  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: this.getMetricsSummary(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// React Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();
    return () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordMetric(`component_${componentName}`, renderTime, 'ms');
    };
  }, [componentName]);
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  return React.memo((props: P) => {
    usePerformanceMonitor(name);
    return React.createElement(WrappedComponent, props);
  });
}

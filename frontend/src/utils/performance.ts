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
  private maxMetrics = 500;

  private constructor() {
    this.observeWebVitals();
    this.observePageLoad();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private observeWebVitals() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) this.recordMetric('LCP', last.startTime, 'ms', { type: 'web-vital' });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordMetric('FID', entry.duration, 'ms', { type: 'web-vital' });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {}

    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          const shift = entry as any;
          if (!shift.hadRecentInput) clsValue += shift.value;
        });
        this.recordMetric('CLS', clsValue, 'score', { type: 'web-vital' });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}
  }

  private observePageLoad() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => this.recordPageLoadMetrics(), 0);
    });
  }

  private recordPageLoadMetrics() {
    let nav: PerformanceNavigationTiming | null = null;

    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) nav = entries[0] as PerformanceNavigationTiming;
    }

    if (nav) {
      const metrics: Record<string, number> = {
        dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnect: nav.connectEnd - nav.connectStart,
        serverResponse: nav.responseEnd - nav.requestStart,
        domLoad: nav.domContentLoadedEventEnd - nav.startTime,
        fullPageLoad: nav.loadEventEnd - nav.startTime,
        redirectTime: nav.redirectEnd - nav.redirectStart,
      };

      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) this.recordMetric(name, value, 'ms', { type: 'page-load' });
      });
    }
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

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
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

  measureComponentRender(componentName: string) {
    return (WrappedComponent: React.ComponentType<any>) => {
      const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
      const MeasuredComponent = (props: any) => {
        const startRef = React.useRef<number>(performance.now());

        React.useEffect(() => {
          const renderTime = performance.now() - startRef.current;
          this.recordMetric(`component_${displayName}`, renderTime, 'ms', { type: 'render' });
        });

        return React.createElement(WrappedComponent, props);
      };
      MeasuredComponent.displayName = `withPerformance(${displayName})`;
      return MeasuredComponent;
    };
  }

  mark(name: string) {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
      try {
        const measure = endMark
          ? performance.measure(name, startMark, endMark)
          : performance.measure(name, startMark);
        this.recordMetric(name, measure.duration, 'ms', { type: 'user-mark' });
      } catch {}
    }
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

export function usePerformanceMonitor(componentName: string) {
  const startRef = React.useRef<number>(performance.now());

  React.useEffect(() => {
    const renderTime = performance.now() - startRef.current;
    performanceMonitor.recordMetric(`component_${componentName}`, renderTime, 'ms', { type: 'render' });
  });
}

export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  const displayName = `withPerformance(${name})`;

  const MonitoredComponent = React.memo((props: P) => {
    usePerformanceMonitor(name);
    return React.createElement(WrappedComponent, props);
  });
  MonitoredComponent.displayName = displayName;

  return MonitoredComponent;
}

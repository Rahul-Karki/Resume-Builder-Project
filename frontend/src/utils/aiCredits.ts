import React from 'react';
import { logger } from './logger';
import { errorTracker } from './errorTracking';

export interface CreditUsage {
  id: string;
  timestamp: string;
  operation: 'improve-text' | 'enhance-bullet' | 'ats-analysis';
  creditsUsed: number;
  creditsRemaining: number;
  status: 'success' | 'failed';
  metadata?: Record<string, any>;
}

export interface CreditAlert {
  id: string;
  type: 'low-credits' | 'out-of-credits' | 'usage-spike';
  threshold: number;
  currentCredits: number;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

const DEFAULT_MONTHLY_CREDITS = 200;
const UNLIMITED_AI_CREDITS = String((import.meta as any).env?.VITE_UNLIMITED_AI_CREDITS ?? "").toLowerCase() === "true";
const USAGE_SPIKE_THRESHOLD = Number(import.meta.env.VITE_CREDIT_SPIKE_THRESHOLD) || 50;
const LOW_CREDITS_THRESHOLD = Number(import.meta.env.VITE_LOW_CREDITS_THRESHOLD) || 10;

const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

class AICreditsManager {
  private static instance: AICreditsManager;
  private remaining = DEFAULT_MONTHLY_CREDITS;
  private resetAt: string | null = null;
  private usage: CreditUsage[] = [];
  private alerts: CreditAlert[] = [];
  private listeners: Set<(credits: number) => void> = new Set();
  private alertListeners: Set<(alert: CreditAlert) => void> = new Set();
  private maxUsageRecords = 1000;
  private spikeUsageCache: { timestamp: number; creditsUsed: number }[] = [];

  static getInstance(): AICreditsManager {
    if (!AICreditsManager.instance) {
      AICreditsManager.instance = new AICreditsManager();
    }
    return AICreditsManager.instance;
  }

  syncFromServer(credits: { remaining: number; resetAt?: string } | null | undefined) {
    if (UNLIMITED_AI_CREDITS) return;
    if (!credits) return;

    this.remaining = Math.max(0, credits.remaining ?? 0);
    if (credits.resetAt) this.resetAt = credits.resetAt;
    this.checkCreditThresholds();
    this.listeners.forEach(listener => listener(this.remaining));
  }

  async recordUsage(operation: CreditUsage['operation'], creditsUsed: number, metadata?: Record<string, any>) {
    const usage: CreditUsage = {
      id: generateId('usage'),
      timestamp: new Date().toISOString(),
      operation,
      creditsUsed: creditsUsed || 0,
      creditsRemaining: this.remaining,
      status: 'success',
      metadata,
    };

    this.usage.push(usage);
    if (this.usage.length > this.maxUsageRecords) {
      this.usage = this.usage.slice(-this.maxUsageRecords);
    }

    this.spikeUsageCache.push({ timestamp: Date.now(), creditsUsed: creditsUsed || 0 });
    this.checkForUsageSpikes();

    logger.info('AI Credits Used', { operation, creditsUsed, remaining: this.remaining });
  }

  async recordFailedUsage(operation: CreditUsage['operation'], creditsAttempted: number, error: Error) {
    const usage: CreditUsage = {
      id: generateId('usage'),
      timestamp: new Date().toISOString(),
      operation,
      creditsUsed: 0,
      creditsRemaining: this.remaining,
      status: 'failed',
      metadata: { error: error.message, creditsAttempted },
    };

    this.usage.push(usage);
    if (this.usage.length > this.maxUsageRecords) {
      this.usage = this.usage.slice(-this.maxUsageRecords);
    }

    logger.warn('AI Credits Usage Failed', { operation, error: error.message });
  }

  estimateCredits(operation: CreditUsage['operation'], textLength?: number): number {
    const baseCosts: Record<CreditUsage['operation'], number> = {
      'improve-text': 2,
      'enhance-bullet': 2,
      'ats-analysis': 5,
    };

    let cost = baseCosts[operation] || 2;
    if (textLength && textLength > 500) {
      cost += Math.ceil((textLength - 500) / 1000);
    }
    return cost;
  }

  canAfford(operation: CreditUsage['operation'], textLength?: number): boolean {
    if (UNLIMITED_AI_CREDITS) return true;
    return this.remaining >= this.estimateCredits(operation, textLength);
  }

  getCurrentCredits(): number {
    if (UNLIMITED_AI_CREDITS) return Number.MAX_SAFE_INTEGER;
    return this.remaining;
  }

  getResetAt(): string | null {
    return this.resetAt;
  }

  getUsageHistory(limit?: number): CreditUsage[] {
    return limit ? this.usage.slice(-limit) : [...this.usage];
  }

  getUsageStats() {
    const successful = this.usage.filter(u => u.status === 'success');
    const failed = this.usage.filter(u => u.status === 'failed');
    const totalUsed = successful.reduce((sum, u) => sum + u.creditsUsed, 0);
    const usageByOperation = successful.reduce((acc, u) => {
      acc[u.operation] = (acc[u.operation] || 0) + u.creditsUsed;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations: this.usage.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      totalCreditsUsed: totalUsed,
      averageCreditsPerOperation: successful.length > 0 ? totalUsed / successful.length : 0,
      usageByOperation,
      currentCredits: this.remaining,
    };
  }

  getAlerts(acknowledged?: boolean): CreditAlert[] {
    return acknowledged !== undefined
      ? this.alerts.filter(a => a.acknowledged === acknowledged)
      : [...this.alerts];
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }

  acknowledgeAllAlerts() {
    this.alerts.forEach(a => a.acknowledged = true);
  }

  onCreditsChange(callback: (credits: number) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onAlert(callback: (alert: CreditAlert) => void) {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  clearAllData() {
    this.usage = [];
    this.alerts = [];
    this.spikeUsageCache = [];
  }

  private checkForUsageSpikes() {
    if (UNLIMITED_AI_CREDITS) return;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    this.spikeUsageCache = this.spikeUsageCache.filter(e => e.timestamp > oneHourAgo);
    const totalUsed = this.spikeUsageCache.reduce((sum, e) => sum + e.creditsUsed, 0);

    if (totalUsed > USAGE_SPIKE_THRESHOLD) {
      this.createAlert('usage-spike', USAGE_SPIKE_THRESHOLD, this.remaining,
        `High usage detected: ${totalUsed} credits used in the last hour`);
    }
  }

  private checkCreditThresholds() {
    if (UNLIMITED_AI_CREDITS) return;

    if (this.remaining <= 0) {
      this.createAlert('out-of-credits', 0, this.remaining,
        'You have run out of AI credits.');
    } else if (this.remaining <= LOW_CREDITS_THRESHOLD) {
      this.createAlert('low-credits', LOW_CREDITS_THRESHOLD, this.remaining,
        `Running low on credits: ${this.remaining} remaining.`);
    }
  }

  private createAlert(type: CreditAlert['type'], threshold: number, currentCredits: number, message: string) {
    if (this.alerts.some(a => a.type === type && !a.acknowledged)) return;

    const alert: CreditAlert = {
      id: generateId('alert'),
      type,
      threshold,
      currentCredits,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.alertListeners.forEach(listener => listener(alert));
    logger.warn('AI Credit Alert', { type, currentCredits, message });
  }
}

export const aiCreditsManager = AICreditsManager.getInstance();

export function useAICredits() {
  const [credits, setCredits] = React.useState(aiCreditsManager.getCurrentCredits());
  const [alerts, setAlerts] = React.useState(aiCreditsManager.getAlerts(false));

  React.useEffect(() => {
    const unsubCredits = aiCreditsManager.onCreditsChange(setCredits);
    const unsubAlerts = aiCreditsManager.onAlert((alert) => {
      setAlerts(prev => [...prev, alert]);
    });
    const interval = setInterval(() => {
      setAlerts(aiCreditsManager.getAlerts(false));
    }, 30000);

    return () => {
      unsubCredits();
      unsubAlerts();
      clearInterval(interval);
    };
  }, []);

  const recordUsage = React.useCallback(async (operation: CreditUsage['operation'], metadata?: Record<string, any>) => {
    await aiCreditsManager.recordUsage(operation, aiCreditsManager.estimateCredits(operation), metadata);
  }, []);

  const acknowledgeAlert = React.useCallback((alertId: string) => {
    aiCreditsManager.acknowledgeAlert(alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, []);

  const canAfford = React.useCallback((operation: CreditUsage['operation'], textLength?: number) => {
    return aiCreditsManager.canAfford(operation, textLength);
  }, []);

  const estimateCredits = React.useCallback((operation: CreditUsage['operation'], textLength?: number) => {
    return aiCreditsManager.estimateCredits(operation, textLength);
  }, []);

  return {
    credits,
    alerts,
    stats: aiCreditsManager.getUsageStats(),
    recordUsage,
    acknowledgeAlert,
    canAfford,
    estimateCredits,
    usageHistory: aiCreditsManager.getUsageHistory(50),
  };
}

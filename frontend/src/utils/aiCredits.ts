import React from 'react';
import { logger } from './logger';
import { errorTracker } from './errorTracking';

export interface CreditUsage {
  id: string;
  timestamp: string;
  operation: 'improve-text' | 'check-grammar' | 'enhance-bullet' | 'ats-analysis';
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

export interface CreditPlan {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  resetDate: string;
  planType: 'free' | 'basic' | 'premium' | 'enterprise';
  features: string[];
}

const FREE_PLAN_CREDITS = 200;

const getPlanCredits = (plan: CreditPlan['planType']) => {
  switch (plan) {
    case 'basic':
      return 1000;
    case 'premium':
      return 5000;
    case 'enterprise':
      return 20000;
    case 'free':
    default:
      return FREE_PLAN_CREDITS;
  }
};

const getNextResetDate = (): string => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString();
};

class AICreditsManager {
  private static instance: AICreditsManager;
  private usage: CreditUsage[] = [];
  private alerts: CreditAlert[] = [];
  private currentPlan: CreditPlan | null = null;
  private listeners: Set<(credits: number) => void> = new Set();
  private alertListeners: Set<(alert: CreditAlert) => void> = new Set();
  private maxUsageRecords = 1000;
  
  private constructor() {
    this.loadStoredData();
    this.ensureFreePlan();
    this.setupUsageMonitoring();
  }

  static getInstance(): AICreditsManager {
    if (!AICreditsManager.instance) {
      AICreditsManager.instance = new AICreditsManager();
    }
    return AICreditsManager.instance;
  }

  private loadStoredData() {
    try {
      const stored = localStorage.getItem('aiCreditsData');
      if (stored) {
        const data = JSON.parse(stored);
        this.usage = data.usage || [];
        this.alerts = data.alerts || [];
        this.currentPlan = data.currentPlan || null;
      }
    } catch (error) {
      errorTracker.trackError('Failed to load AI credits data', error);
    }
  }

  private ensureFreePlan() {
    this.checkAndResetMonthly();

    if (!this.currentPlan) {
      this.currentPlan = {
        totalCredits: FREE_PLAN_CREDITS,
        usedCredits: 0,
        remainingCredits: FREE_PLAN_CREDITS,
        resetDate: getNextResetDate(),
        planType: 'free',
        features: ['improve-text', 'check-grammar', 'enhance-bullet', 'ats-analysis'],
      };
      this.saveData();
      logger.info('AI Credits Free Plan Initialized', { totalCredits: FREE_PLAN_CREDITS });
    }
  }

  private checkAndResetMonthly() {
    if (!this.currentPlan) return;

    const now = new Date();
    const resetDate = new Date(this.currentPlan.resetDate);

    if (now >= resetDate) {
      this.currentPlan = {
        totalCredits: FREE_PLAN_CREDITS,
        usedCredits: 0,
        remainingCredits: FREE_PLAN_CREDITS,
        resetDate: getNextResetDate(),
        planType: this.currentPlan.planType,
        features: this.currentPlan.features,
      };
      this.usage = [];
      this.alerts = [];
      this.saveData();
      this.listeners.forEach(listener => listener(FREE_PLAN_CREDITS));
      logger.info('AI Credits Monthly Reset', { newCredits: FREE_PLAN_CREDITS });
    }
  }

  private saveData() {
    try {
      const data = {
        usage: this.usage.slice(-100), // Keep only last 100 records in localStorage
        alerts: this.alerts.filter(a => !a.acknowledged).slice(-20), // Keep only unacknowledged alerts
        currentPlan: this.currentPlan,
      };
      localStorage.setItem('aiCreditsData', JSON.stringify(data));
    } catch (error) {
      errorTracker.trackError('Failed to save AI credits data', error);
    }
  }

  private setupUsageMonitoring() {
    // Check for usage spikes every minute
    setInterval(() => {
      this.checkForUsageSpikes();
    }, 60000);

    // Check credit thresholds every 5 minutes
    setInterval(() => {
      this.checkCreditThresholds();
    }, 300000);
  }

  private checkForUsageSpikes() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentUsage = this.usage.filter(u => 
      new Date(u.timestamp).getTime() > oneHourAgo && u.status === 'success'
    );
    
    const totalCreditsUsed = recentUsage.reduce((sum, u) => sum + u.creditsUsed, 0);
    
    // Alert if more than 50 credits used in an hour (adjust threshold as needed)
    if (totalCreditsUsed > 50) {
      this.createAlert('usage-spike', 50, this.getCurrentCredits(), 
        `High usage detected: ${totalCreditsUsed} credits used in the last hour`);
    }
  }

  private checkCreditThresholds() {
    const currentCredits = this.getCurrentCredits();
    
    if (currentCredits <= 0) {
      this.createAlert('out-of-credits', 0, currentCredits, 
        'You have run out of AI credits. Please upgrade your plan to continue using AI features.');
    } else if (currentCredits <= 10) {
      this.createAlert('low-credits', 10, currentCredits, 
        `Running low on credits: ${currentCredits} remaining. Consider upgrading your plan.`);
    }
  }

  private createAlert(type: CreditAlert['type'], threshold: number, currentCredits: number, message: string) {
    // Check if we already have an unacknowledged alert of this type
    const existingAlert = this.alerts.find(a => a.type === type && !a.acknowledged);
    if (existingAlert) return;

    const alert: CreditAlert = {
      id: this.generateAlertId(),
      type,
      threshold,
      currentCredits,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.saveData();
    
    // Notify listeners
    this.alertListeners.forEach(listener => listener(alert));
    
    logger.warn('AI Credit Alert', { type, currentCredits, message });
  }

  async recordUsage(operation: CreditUsage['operation'], creditsUsed: number, metadata?: Record<string, any>): Promise<void> {
    const currentCredits = this.getCurrentCredits();
    
    if (currentCredits < creditsUsed) {
      const error = new Error(`Insufficient credits. Required: ${creditsUsed}, Available: ${currentCredits}`);
      errorTracker.trackError('Insufficient AI Credits', error, { operation, creditsUsed, currentCredits });
      throw error;
    }

    const usage: CreditUsage = {
      id: this.generateUsageId(),
      timestamp: new Date().toISOString(),
      operation,
      creditsUsed,
      creditsRemaining: currentCredits - creditsUsed,
      status: 'success',
      metadata,
    };

    this.usage.push(usage);
    this.updateCurrentPlan(currentCredits - creditsUsed);
    this.saveData();
    
    // Notify listeners of credit change
    this.listeners.forEach(listener => listener(usage.creditsRemaining));
    
    logger.info('AI Credits Used', { operation, creditsUsed, remaining: usage.creditsRemaining });
  }

  async recordFailedUsage(operation: CreditUsage['operation'], creditsAttempted: number, error: Error): Promise<void> {
    const usage: CreditUsage = {
      id: this.generateUsageId(),
      timestamp: new Date().toISOString(),
      operation,
      creditsUsed: 0,
      creditsRemaining: this.getCurrentCredits(),
      status: 'failed',
      metadata: { error: error.message, creditsAttempted },
    };

    this.usage.push(usage);
    this.saveData();
    
    logger.warn('AI Credits Usage Failed', { operation, error: error.message });
  }

  private generateUsageId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private updateCurrentPlan(newRemainingCredits: number) {
    if (this.currentPlan) {
      this.currentPlan.usedCredits = this.currentPlan.totalCredits - newRemainingCredits;
      this.currentPlan.remainingCredits = newRemainingCredits;
    }
  }

  setCurrentPlan(plan: CreditPlan) {
    this.currentPlan = plan;
    this.saveData();
    logger.info('AI Credits Plan Updated', { planType: plan.planType, totalCredits: plan.totalCredits });
  }

  syncFromServer(credits: { remaining: number; resetAt?: string; plan?: CreditPlan['planType'] } | null | undefined) {
    if (!credits) return;
    const planType = credits.plan ?? this.currentPlan?.planType ?? 'free';
    const totalCredits = getPlanCredits(planType);
    const remaining = Math.max(0, credits.remaining ?? 0);
    this.currentPlan = {
      totalCredits,
      usedCredits: Math.max(0, totalCredits - remaining),
      remainingCredits: remaining,
      resetDate: credits.resetAt ?? getNextResetDate(),
      planType,
      features: ['improve-text', 'check-grammar', 'enhance-bullet', 'ats-analysis'],
    };
    this.saveData();
    this.listeners.forEach(listener => listener(remaining));
  }

  getCurrentCredits(): number {
    return this.currentPlan?.remainingCredits || 0;
  }

  getCurrentPlan(): CreditPlan | null {
    return this.currentPlan;
  }

  getUsageHistory(limit?: number): CreditUsage[] {
    return limit ? this.usage.slice(-limit) : [...this.usage];
  }

  getUsageByOperation(operation: CreditUsage['operation']): CreditUsage[] {
    return this.usage.filter(u => u.operation === operation);
  }

  getUsageStats() {
    const successful = this.usage.filter(u => u.status === 'success');
    const failed = this.usage.filter(u => u.status === 'failed');
    
    const totalUsed = successful.reduce((sum, u) => sum + u.creditsUsed, 0);
    const usageByOperation = successful.reduce((acc, u) => {
      acc[u.operation] = (acc[u.operation] || 0) + u.creditsUsed;
      return acc;
    }, {} as Record<string, number>);

    // Daily usage for the last 7 days
    const dailyUsage = this.getDailyUsage(7);

    return {
      totalOperations: this.usage.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      totalCreditsUsed: totalUsed,
      averageCreditsPerOperation: successful.length > 0 ? totalUsed / successful.length : 0,
      usageByOperation,
      dailyUsage,
      currentCredits: this.getCurrentCredits(),
    };
  }

  private getDailyUsage(days: number): Record<string, number> {
    const now = new Date();
    const dailyUsage: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyUsage[dateKey] = 0;
    }

    this.usage
      .filter(u => u.status === 'success')
      .forEach(u => {
        const dateKey = u.timestamp.split('T')[0];
        if (dailyUsage.hasOwnProperty(dateKey)) {
          dailyUsage[dateKey] += u.creditsUsed;
        }
      });

    return dailyUsage;
  }

  getAlerts(acknowledged?: boolean): CreditAlert[] {
    return acknowledged !== undefined 
      ? this.alerts.filter(a => a.acknowledged === acknowledged)
      : [...this.alerts];
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveData();
    }
  }

  acknowledgeAllAlerts() {
    this.alerts.forEach(a => a.acknowledged = true);
    this.saveData();
  }

  // Event listeners
  onCreditsChange(callback: (credits: number) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onAlert(callback: (alert: CreditAlert) => void) {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  // Estimate credits needed for operations
  estimateCredits(operation: CreditUsage['operation'], textLength?: number): number {
    const baseCosts = {
      'improve-text': 2,
      'check-grammar': 1,
      'enhance-bullet': 2,
      'ats-analysis': 5,
    };

    let baseCost = baseCosts[operation] || 2;
    
    // Adjust cost based on text length (if provided)
    // Soft multiplier: only adds +1 credit per 1000 chars beyond the first 500
    if (textLength && textLength > 500) {
      const extraChunks = Math.ceil((textLength - 500) / 1000);
      baseCost += extraChunks;
    }

    return baseCost;
  }

  canAfford(operation: CreditUsage['operation'], textLength?: number): boolean {
    const estimatedCost = this.estimateCredits(operation, textLength);
    return this.getCurrentCredits() >= estimatedCost;
  }

  clearAllData() {
    this.usage = [];
    this.alerts = [];
    this.currentPlan = null;
    this.saveData();
  }

  exportData(): string {
    return JSON.stringify({
      usage: this.usage,
      alerts: this.alerts,
      currentPlan: this.currentPlan,
      stats: this.getUsageStats(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

export const aiCreditsManager = AICreditsManager.getInstance();

// React Hook for AI credits
export function useAICredits() {
  const [credits, setCredits] = React.useState(aiCreditsManager.getCurrentCredits());
  const [plan, setPlan] = React.useState(aiCreditsManager.getCurrentPlan());
  const [alerts, setAlerts] = React.useState(aiCreditsManager.getAlerts(false));

  React.useEffect(() => {
    // Listen for credit changes
    const unsubscribeCredits = aiCreditsManager.onCreditsChange((newCredits) => {
      setCredits(newCredits);
      setPlan(aiCreditsManager.getCurrentPlan());
    });

    // Listen for new alerts
    const unsubscribeAlerts = aiCreditsManager.onAlert((newAlert) => {
      setAlerts(prev => [...prev, newAlert]);
    });

    // Update alerts every 30 seconds
    const alertInterval = setInterval(() => {
      setAlerts(aiCreditsManager.getAlerts(false));
    }, 30000);

    return () => {
      unsubscribeCredits();
      unsubscribeAlerts();
      clearInterval(alertInterval);
    };
  }, []);

  const recordUsage = React.useCallback(async (operation: CreditUsage['operation'], metadata?: Record<string, any>) => {
    try {
      await aiCreditsManager.recordUsage(operation, aiCreditsManager.estimateCredits(operation), metadata);
    } catch (error) {
      throw error;
    }
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
    plan,
    alerts,
    stats: aiCreditsManager.getUsageStats(),
    recordUsage,
    acknowledgeAlert,
    canAfford,
    estimateCredits,
    usageHistory: aiCreditsManager.getUsageHistory(50),
  };
}

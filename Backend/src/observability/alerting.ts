import { logger } from "../observability";

/**
 * Alerting Service
 * 
 * Sends alerts for critical compliance, security, and reliability issues
 * Supports multiple channels: webhooks, email, Slack, PagerDuty
 * Metrics are tracked via Prometheus → Grafana Cloud; alert rules configured in Grafana
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertChannel = "webhook" | "slack" | "email" | "pagerduty";

export interface AlertPayload {
  title: string;
  description: string;
  severity: AlertSeverity;
  category: "compliance" | "security" | "reliability" | "performance" | "data-integrity";
  channels: AlertChannel[];
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  affectedUser?: string;
  affectedCollection?: string;
  timestamp?: Date;
}

export interface AlertRule {
  name: string;
  enabled: boolean;
  threshold: number;
  timeWindow: number; // milliseconds
  channels: AlertChannel[];
}

export class AlertingService {
  private alertRules: Map<string, AlertRule> = new Map();
  private eventCounts: Map<string, number[]> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private alertDebounceTime = 300000; // 5 minutes

  constructor() {
    this.setupDefaultRules();
  }

  private setupDefaultRules() {
    // Critical: More than 10 validation errors in 5 minutes
    this.addRule({
      name: "high_validation_error_rate",
      enabled: true,
      threshold: 10,
      timeWindow: 300000,
      channels: ["slack"],
    });

    // Critical: Any referential integrity violation
    this.addRule({
      name: "referential_integrity_violation",
      enabled: true,
      threshold: 1,
      timeWindow: 60000,
      channels: ["slack", "pagerduty"],
    });

    // High: More than 5 cascade delete failures in 10 minutes
    this.addRule({
      name: "cascade_delete_failures",
      enabled: true,
      threshold: 5,
      timeWindow: 600000,
      channels: ["slack"],
    });

    // Medium: More than 20 orphaned documents detected
    this.addRule({
      name: "orphaned_documents",
      enabled: true,
      threshold: 20,
      timeWindow: 300000,
      channels: ["slack"],
    });

    // High: Missing audit logs
    this.addRule({
      name: "missing_audit_logs",
      enabled: true,
      threshold: 1,
      timeWindow: 60000,
      channels: ["slack"],
    });

    // Critical: Data corruption detected
    this.addRule({
      name: "data_corruption",
      enabled: true,
      threshold: 1,
      timeWindow: 60000,
      channels: ["slack", "pagerduty"],
    });

    // High: AI provider auth failure (API key expired/invalid)
    this.addRule({
      name: "ai_auth_failure",
      enabled: true,
      threshold: 1,
      timeWindow: 60000,
      channels: ["slack", "pagerduty"],
    });

    // High: Frontend critical error (client-side crash)
    this.addRule({
      name: "frontend_critical_error",
      enabled: true,
      threshold: 5,
      timeWindow: 300000,
      channels: ["slack"],
    });
  }

  /**
   * Add or update an alert rule
   */
  addRule(rule: AlertRule) {
    this.alertRules.set(rule.name, rule);
    logger.info({ rule }, "Alert rule configured");
  }

  /**
   * Get rule by name
   */
  getRule(name: string): AlertRule | undefined {
    return this.alertRules.get(name);
  }

  /**
   * Check if alert should be sent based on rules
   */
  shouldAlert(ruleName: string): boolean {
    const rule = this.alertRules.get(ruleName);
    if (!rule || !rule.enabled) return false;

    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(ruleName) || 0;

    // Don't alert too frequently (debounce)
    if (now - lastAlert < this.alertDebounceTime) {
      return false;
    }

    const events = this.eventCounts.get(ruleName) || [];
    const recentEvents = events.filter((time) => now - time < rule.timeWindow);

    if (recentEvents.length >= rule.threshold) {
      this.lastAlertTime.set(ruleName, now);
      this.eventCounts.set(ruleName, []);
      return true;
    }

    return false;
  }

  /**
   * Record event for rule tracking
   */
  recordEvent(ruleName: string) {
    const events = this.eventCounts.get(ruleName) || [];
    events.push(Date.now());
    this.eventCounts.set(ruleName, events);
  }

  /**
   * Send alert to appropriate channels
   */
  async sendAlert(payload: AlertPayload): Promise<boolean> {
    const channels = payload.channels || ["slack"];

    try {
      let allSucceeded = true;

      for (const channel of channels) {
        try {
          switch (channel) {
            case "slack":
              await this.sendSlackAlert(payload);
              break;
            case "webhook":
              await this.sendWebhookAlert(payload);
              break;
            case "email":
              await this.sendEmailAlert(payload);
              break;
            case "pagerduty":
              await this.sendPagerDutyAlert(payload);
              break;
            default:
              logger.warn({ channel }, "Unknown alert channel");
              allSucceeded = false;
          }
        } catch (error) {
          logger.error(
            { error, channel, alert: payload.title },
            "Failed to send alert via channel"
          );
          allSucceeded = false;
        }
      }

      return allSucceeded;
    } catch (error) {
      logger.error({ error, alert: payload }, "Alert sending failed");
      return false;
    }
  }

  /**
   * Send alert via Slack
   */
  private async sendSlackAlert(payload: AlertPayload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn("SLACK_WEBHOOK_URL not configured");
      return;
    }

    const color = this.getSeverityColor(payload.severity);
    const timestamp = (payload.timestamp || new Date()).toISOString();

    const slackPayload = {
      attachments: [
        {
          color,
          title: payload.title,
          text: payload.description,
          fields: [
            {
              title: "Severity",
              value: payload.severity.toUpperCase(),
              short: true,
            },
            {
              title: "Category",
              value: payload.category,
              short: true,
            },
            {
              title: "Timestamp",
              value: timestamp,
              short: true,
            },
            ...(payload.affectedCollection
              ? [{ title: "Collection", value: payload.affectedCollection, short: true }]
              : []),
            ...(payload.affectedUser
              ? [{ title: "User", value: payload.affectedUser, short: true }]
              : []),
          ],
          footer: "Resume Builder Alerts",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });

    logger.info({ title: payload.title }, "Alert sent to Slack");
  }

  /**
   * Send alert via webhook
   */
  private async sendWebhookAlert(payload: AlertPayload) {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn("ALERT_WEBHOOK_URL not configured");
      return;
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        timestamp: payload.timestamp || new Date(),
      }),
    });

    logger.info({ title: payload.title }, "Alert sent to webhook");
  }

  /**
   * Send alert via email
   */
  private async sendEmailAlert(payload: AlertPayload) {
    const emailTo = process.env.ALERT_EMAIL_TO;
    if (!emailTo) {
      logger.warn("ALERT_EMAIL_TO not configured");
      return;
    }

    // This would integrate with Resend or other email service
    logger.info({ title: payload.title, to: emailTo }, "Alert email queued");
  }

  /**
   * Send alert via PagerDuty
   */
  private async sendPagerDutyAlert(payload: AlertPayload) {
    const integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY;
    if (!integrationKey) {
      logger.warn("PAGERDUTY_INTEGRATION_KEY not configured");
      return;
    }

    const pagerDutyPayload = {
      routing_key: integrationKey,
      event_action: "trigger",
      dedup_key: `${payload.category}-${payload.affectedCollection || "system"}`,
      payload: {
        summary: payload.title,
        severity: this.mapSeverityToPagerDutySeverity(payload.severity),
        source: "Resume Builder",
        custom_details: {
          description: payload.description,
          category: payload.category,
          metadata: payload.metadata,
          timestamp: (payload.timestamp || new Date()).toISOString(),
        },
      },
    };

    await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pagerDutyPayload),
    });

    logger.info({ title: payload.title }, "Alert sent to PagerDuty");
  }

  // Helper methods
  private mapSeverityToPagerDutySeverity(severity: AlertSeverity): "critical" | "error" | "warning" | "info" {
    switch (severity) {
      case "critical":
        return "critical";
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case "critical":
        return "#FF0000"; // Red
      case "high":
        return "#FF9900"; // Orange
      case "medium":
        return "#FFFF00"; // Yellow
      case "low":
        return "#00CCFF"; // Blue
    }
  }
}

// Export singleton instance
export const alertingService = new AlertingService();

// Convenience functions
export async function alertComplianceIssue(
  title: string,
  description: string,
  severity: AlertSeverity,
  metadata?: Record<string, any>
) {
  return alertingService.sendAlert({
    title,
    description,
    severity,
    category: "compliance",
    channels: severity === "critical" ? ["slack", "pagerduty"] : ["slack"],
    metadata,
  });
}

export async function alertSecurityIssue(
  title: string,
  description: string,
  severity: AlertSeverity,
  affectedUser?: string
) {
  return alertingService.sendAlert({
    title,
    description,
    severity,
    category: "security",
    channels: ["slack", "pagerduty"],
    affectedUser,
  });
}

export async function alertDataIntegrityIssue(
  title: string,
  description: string,
  affectedCollection: string,
  metadata?: Record<string, any>
) {
  return alertingService.sendAlert({
    title,
    description,
    severity: "critical",
    category: "data-integrity",
    channels: ["slack", "pagerduty"],
    affectedCollection,
    metadata,
  });
}

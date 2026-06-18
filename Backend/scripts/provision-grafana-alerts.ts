import { readFileSync } from "fs";
import { join } from "path";

/**
 * Provision Grafana Cloud alert rules via the Provisioning API.
 *
 * Prerequisites:
 *   1. Grafana Cloud stack URL (e.g. https://my-stack.grafana.net)
 *   2. Grafana Service Account token with "Alerting Provisioning" role
 *      Create at: Grafana Cloud → Administration → Service accounts → "Alerting Provisioning"
 *
 * Usage:
 *   GRAFANA_STACK_URL=https://my-stack.grafana.net \
 *   GRAFANA_SERVICE_ACCOUNT_TOKEN=glas_... \
 *   GRAFANA_PROM_UID=grafanacloud-prom \
 *   npx ts-node scripts/provision-grafana-alerts.ts
 *
 * To dry-run without making changes:
 *   DRY_RUN=true npx ts-node scripts/provision-grafana-alerts.ts
 */

const STACK_URL = process.env.GRAFANA_STACK_URL || "";
const API_TOKEN = process.env.GRAFANA_SERVICE_ACCOUNT_TOKEN || "";
const PROM_UID = process.env.GRAFANA_PROM_UID || "grafanacloud-prom";
const DRY_RUN = process.env.DRY_RUN === "true";

interface AlertRuleDef {
  title: string;
  expr: string;
  for: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

interface RuleGroup {
  name: string;
  interval: string;
  rules: AlertRuleDef[];
}

interface AlertConfig {
  contact_points: any[];
  notification_policy: any;
  rule_groups: RuleGroup[];
}

function toGrafanaQuery(expr: string, refId: string) {
  return {
    refId,
    queryType: "",
    relativeTimeRange: { from: 300, to: 0 },
    datasourceUid: PROM_UID,
    model: {
      expr,
      intervalMs: 15000,
      maxDataPoints: 100,
      refId,
    },
  };
}

function toGrafanaAlertRule(rule: AlertRuleDef, group: RuleGroup) {
  return {
    title: rule.title,
    condition: "A",
    data: [toGrafanaQuery(rule.expr, "A")],
    no_data_state: "NoData",
    exec_err_state: "Alerting",
    for: rule.for,
    annotations: rule.annotations,
    labels: { ...rule.labels, rule_group: group.name },
    rule_group: group.name,
    interval: group.interval,
  };
}

async function provision() {
  if (!STACK_URL || !API_TOKEN) {
    console.error(
      "Missing required env vars:\n" +
        "  GRAFANA_STACK_URL=https://my-stack.grafana.net\n" +
        "  GRAFANA_SERVICE_ACCOUNT_TOKEN=glas_..."
    );
    process.exit(1);
  }

  const configPath = join(__dirname, "grafana-alerts.json");
  const config: AlertConfig = JSON.parse(readFileSync(configPath, "utf-8"));

  const apiUrl = `${STACK_URL.replace(/\/+$/, "")}/api/v1/provisioning`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  };

  const api = async (method: string, path: string, body?: any) => {
    const url = `${apiUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Grafana API ${method} ${path}: ${res.status} — ${text.slice(0, 300)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  // Step 1: Create contact points
  console.log("\n=== Contact Points ===");
  for (const cp of config.contact_points) {
    const name = cp.name;
    // Check if already exists
    const existing = await api("GET", `/contact-points`).catch(() => []);
    const exists = Array.isArray(existing) && existing.some((e: any) => e.name === name);

    if (exists) {
      console.log(`  Contact point "${name}" already exists — skipping`);
      continue;
    }

    const payload = {
      name: cp.name,
      type: cp.type,
      settings: Object.fromEntries(
        Object.entries(cp.settings).filter(
          ([, v]) => typeof v === "string" && !v.startsWith("${")
        )
      ),
    };

    if (payload.type === "slack" && !payload.settings.url) {
      console.warn(`  Slack webhook URL not set — using env var SLACK_WEBHOOK_URL`);
      payload.settings.url = process.env.SLACK_WEBHOOK_URL || "";
    }
    if (payload.type === "pagerduty" && !payload.settings.integrationKey) {
      console.warn(`  PagerDuty key not set — using env var PAGERDUTY_INTEGRATION_KEY`);
      payload.settings.integrationKey = process.env.PAGERDUTY_INTEGRATION_KEY || "";
    }

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would create contact point "${name}":`, JSON.stringify(payload, null, 2));
      continue;
    }
    try {
      const result = await api("POST", "/contact-points", payload);
      console.log(`  Created contact point "${name}": ${result?.name || "ok"}`);
    } catch (err: any) {
      console.error(`  Failed to create contact point "${name}": ${err.message}`);
    }
  }

  // Step 2: Set notification policy
  console.log("\n=== Notification Policy ===");
  if (!DRY_RUN) {
    try {
      const policy = config.notification_policy;
      await api("PUT", "/policies", policy);
      console.log("  Notification policy updated");
    } catch (err: any) {
      console.error(`  Failed to update notification policy: ${err.message}`);
    }
  } else {
    console.log("  [DRY-RUN] Would update notification policy:", JSON.stringify(config.notification_policy, null, 2));
  }

  // Step 3: Create alert rules (group by group)
  console.log("\n=== Alert Rules ===");
  for (const group of config.rule_groups) {
    console.log(`\n  Group: ${group.name} (every ${group.interval})`);

    // Get existing rules in this group
    let existingRules: any[] = [];
    try {
      const allRules = await api("GET", "/alert-rules");
      if (Array.isArray(allRules)) {
        existingRules = allRules.filter((r: any) => r.rule_group === group.name);
      }
    } catch {
      // Start fresh
    }

    for (const rule of group.rules) {
      const exists = existingRules.find((r: any) => r.title === rule.title);
      if (exists) {
        console.log(`    "✓ ${rule.title}" — already exists, skipping`);
        continue;
      }

      const payload = toGrafanaAlertRule(rule, group);

      if (DRY_RUN) {
        console.log(`    [DRY-RUN] Would create "${rule.title}": expr=${rule.expr}`);
        continue;
      }
      try {
        const result = await api("POST", "/alert-rules", payload);
        console.log(`    ✓ Created "${rule.title}"`);
      } catch (err: any) {
        console.error(`    ✗ Failed "${rule.title}": ${err.message}`);
      }
    }
  }

  console.log("\n=== Done ===");
}

provision().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});

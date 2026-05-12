import { Request } from "express";
import { logger } from "../observability";

export enum SecurityEvent {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  TOKEN_REFRESH = "TOKEN_REFRESH",
  AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID",
  CSRF_VALIDATION_FAILED = "CSRF_VALIDATION_FAILED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS",
  PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED",
  ADMIN_ACTION = "ADMIN_ACTION",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
}

interface SecurityEventMetadata {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Log security-relevant events for audit trail
 * Use for: auth events, failed attempts, admin actions, suspicious activity
 */
export function logSecurityEvent(
  event: SecurityEvent,
  metadata: SecurityEventMetadata,
  message?: string
): void {
  // Security events are always logged at "warn" level or higher
  // to ensure they're captured even in production
  const level =
    event.includes("FAILED") || event.includes("INVALID") || event.includes("SUSPICIOUS")
      ? "error"
      : "warn";

  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    userId: metadata.userId || "anonymous",
    email: metadata.email,
    ip: metadata.ip || "unknown",
    userAgent: metadata.userAgent,
    correlationId: metadata.correlationId,
    ...metadata.details,
  };

  if (level === "error") {
    logger.error(logEntry, message || event);
  } else {
    logger.warn(logEntry, message || event);
  }
}

/**
 * Helper to extract security context from request
 */
export function getSecurityContext(req: Request) {
  const headerGetter = typeof req.get === "function"
    ? req.get.bind(req)
    : (name: string) => {
        const value = req.headers?.[name.toLowerCase() as keyof typeof req.headers];
        return Array.isArray(value) ? value[0] : (value as string | undefined);
      };

  return {
    userId: (req.user?.id) || undefined,
    ip: req.ip,
    userAgent: headerGetter("user-agent"),
    correlationId: req.correlationId,
  };
}

/**
 * Log login attempt
 */
export function logLoginAttempt(
  req: Request,
  email: string,
  success: boolean,
  reason?: string
) {
  logSecurityEvent(
    success ? SecurityEvent.LOGIN_SUCCESS : SecurityEvent.LOGIN_FAILED,
    {
      email,
      ...getSecurityContext(req),
      details: {
        reason: reason || (success ? "Credentials valid" : "Invalid credentials"),
      },
    },
    `Login ${success ? "successful" : "failed"} for ${email}`
  );
}

/**
 * Log logout
 */
export function logLogout(req: Request) {
  logSecurityEvent(
    SecurityEvent.LOGOUT,
    {
      ...getSecurityContext(req),
    },
    `User ${req.user?.id || "unknown"} logged out`
  );
}

/**
 * Log failed authentication
 */
export function logAuthFailure(req: Request, reason: string) {
  logSecurityEvent(
    SecurityEvent.AUTH_TOKEN_INVALID,
    {
      ...getSecurityContext(req),
      details: { reason },
    },
    `Authentication failed: ${reason}`
  );
}

/**
 * Log CSRF validation failure
 */
export function logCsrfFailure(req: Request) {
  logSecurityEvent(
    SecurityEvent.CSRF_VALIDATION_FAILED,
    {
      ...getSecurityContext(req),
      details: {
        method: req.method,
        path: req.path,
      },
    },
    `CSRF validation failed for ${req.method} ${req.path}`
  );
}

/**
 * Log unauthorized access attempt
 */
export function logUnauthorizedAccess(req: Request, resource: string, reason: string) {
  logSecurityEvent(
    SecurityEvent.UNAUTHORIZED_ACCESS,
    {
      ...getSecurityContext(req),
      details: {
        resource,
        reason,
        method: req.method,
        path: req.path,
      },
    },
    `Unauthorized access attempt to ${resource}: ${reason}`
  );
}

/**
 * Log admin action
 */
export function logAdminAction(req: Request, action: string, details: Record<string, unknown>) {
  logSecurityEvent(
    SecurityEvent.ADMIN_ACTION,
    {
      ...getSecurityContext(req),
      details: {
        action,
        ...details,
      },
    },
    `Admin action: ${action}`
  );
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(req: Request, activity: string, details?: Record<string, unknown>) {
  logSecurityEvent(
    SecurityEvent.SUSPICIOUS_ACTIVITY,
    {
      ...getSecurityContext(req),
      details: {
        activity,
        ...details,
      },
    },
    `Suspicious activity detected: ${activity}`
  );
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "SERVER_ERROR"
  | "OAUTH_LINK_CONFIRMATION_REQUIRED"
  | string;

type AppErrorOptions = {
  statusCode?: number;
  code?: ErrorCode;
  details?: unknown;
  expose?: boolean;
  cause?: unknown;
};

export class AppError extends Error {
  public readonly statusCode: number;

  public readonly code: ErrorCode;

  public readonly details?: unknown;

  public readonly expose: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "SERVER_ERROR";
    this.details = options.details;
    this.expose = options.expose ?? this.statusCode < 500;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request payload", details?: unknown) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
      expose: true,
    });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: unknown) {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND",
      details,
      expose: true,
    });
    this.name = "NotFoundError";
  }
}

export class AuthError extends AppError {
  constructor(
    message = "Authentication required",
    options: Omit<AppErrorOptions, "statusCode"> & { statusCode?: number } = {},
  ) {
    super(message, {
      statusCode: options.statusCode ?? 401,
      code: options.code ?? (options.statusCode === 403 ? "FORBIDDEN" : "AUTH_REQUIRED"),
      details: options.details,
      expose: true,
      cause: options.cause,
    });
    this.name = "AuthError";
  }
}

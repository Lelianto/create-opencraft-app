/**
 * Central error taxonomy.
 *
 * Route Handlers should throw `AppError` (or let one bubble up from a service)
 * and convert it at the boundary with `toAppError`. Unknown errors deliberately
 * collapse to a generic INTERNAL failure so provider messages and stack traces
 * never reach the client.
 */
export const errorCodes = {
  UNAUTHENTICATED: { status: 401, message: "Authentication required" },
  FORBIDDEN: { status: 403, message: "You are not allowed to do this" },
  NOT_FOUND: { status: 404, message: "Not found" },
  CONFLICT: { status: 409, message: "That change conflicts with the current state" },
  INVALID_INPUT: { status: 422, message: "Check the submitted fields" },
  RATE_LIMITED: { status: 429, message: "Too many requests, try again later" },
  INTERNAL: { status: 500, message: "Something went wrong" },
} as const;

export type ErrorCode = keyof typeof errorCodes;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly fieldErrors?: Record<string, string[]>,
    // `Error` already declares `cause` (ES2022), so this must be marked override.
    public override readonly cause?: unknown,
  ) {
    super(message ?? errorCodes[code].message);
    this.name = "AppError";
  }

  get status(): number {
    return errorCodes[this.code].status;
  }

  toApiFailure() {
    return {
      code: this.code,
      message: this.message,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Normalise anything thrown into an `AppError`.
 *
 * Anything unrecognised becomes INTERNAL with a generic message: the original
 * error is kept on `cause` for server-side logging but is never serialised to
 * the client.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return new AppError("INTERNAL", errorCodes.INTERNAL.message, undefined, error);
}

/**
 * Log an error without leaking secrets.
 *
 * Only the code, a short message, and the error type are emitted. Request
 * bodies, tokens, cookies, and headers are never logged.
 */
export function logError(context: string, error: unknown): void {
  const appError = toAppError(error);
  const detail =
    appError.cause instanceof Error ? `${appError.cause.name}: ${appError.cause.message}` : "";

  console.error(
    JSON.stringify({
      context,
      code: appError.code,
      status: appError.status,
      // `detail` originates from our own code or an SDK, never from user input.
      detail: detail.slice(0, 300),
    }),
  );
}

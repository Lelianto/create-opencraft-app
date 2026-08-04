export const errorCodes = {
  UNAUTHENTICATED: { status: 401, message: "Authentication required" },
  FORBIDDEN: { status: 403, message: "You are not allowed to do this" },
  INVALID_INPUT: { status: 422, message: "Check the submitted fields" },
  RATE_LIMITED: { status: 429, message: "Too many requests, try again later" },
} as const;

export type ErrorCode = keyof typeof errorCodes;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly fieldErrors?: Record<string, string[]>,
    public readonly cause?: unknown,
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

export const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.message === "UNAUTHENTICATED") return new AppError("UNAUTHENTICATED");
  return new AppError("INVALID_INPUT", "Something went wrong", undefined, error);
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
import { NextResponse } from "next/server";
import type { ApiFailure, ApiSuccess } from "@/types/api";

/**
 * Typed helpers for the shared API envelope.
 *
 * Every Route Handler should return through `ok` or `fail` so clients can rely on
 * a single response shape and discriminate on `success`.
 */

/** Success response. Defaults to 200; pass 201 for created resources. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

/**
 * Failure response.
 *
 * `message` must be safe to show a user: never pass a provider error, an
 * exception message, or a stack trace. Use `fieldErrors` for per-field validation
 * feedback.
 */
export function fail(
  code: string,
  message: string,
  status = 400,
  fieldErrors?: Record<string, string[]>,
) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
      },
    },
    { status },
  );
}

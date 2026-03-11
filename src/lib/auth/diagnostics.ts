import type { NextRequest } from "next/server";

function getSupabaseCookieNames(request: NextRequest) {
  return request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith("sb-"))
    .sort();
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

export function logAuthDiagnostic(
  level: "info" | "warn" | "error",
  event: string,
  request: NextRequest,
  details?: Record<string, unknown>
) {
  const payload = {
    event,
    path: request.nextUrl.pathname,
    method: request.method,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    proto: request.headers.get("x-forwarded-proto"),
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent")?.slice(0, 160),
    authCookieNames: getSupabaseCookieNames(request),
    ...details,
  };

  const logger =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;

  logger("[auth]", JSON.stringify(payload));
}

export function getDiagnosticErrorPayload(error: unknown) {
  return serializeError(error);
}


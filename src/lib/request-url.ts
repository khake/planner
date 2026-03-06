import type { NextRequest } from "next/server";

type RequestLike = Request | NextRequest;

export function getRequestOrigin(request: RequestLike) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function buildRequestUrl(path: string, request: RequestLike) {
  return new URL(path, getRequestOrigin(request));
}

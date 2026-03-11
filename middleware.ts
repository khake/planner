import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  logAuthDiagnostic,
} from "@/lib/auth/diagnostics";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // allow assets and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile") ||
    pathname === "/tickets" ||
    pathname.startsWith("/tickets/") ||
    pathname === "/epics" ||
    pathname.startsWith("/epics/");

  const { response, userId, claimsSub } = await updateSession(request);

  if (!isProtected) {
    return response;
  }

  if (!userId) {
    logAuthDiagnostic("warn", "middleware.protected.redirect_to_login", request, {
      reason: "missing_user_after_get_user",
      claimsSub: claimsSub ?? null,
      redirectTo: "/login",
      from: pathname,
    });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // ให้ middleware ช่วย refresh session ในทุกหน้าที่เป็น app route
  matcher: ["/", "/login", "/register", "/projects", "/projects/(.*)", "/profile", "/profile/(.*)", "/tickets", "/tickets/(.*)", "/epics", "/epics/(.*)"],
};


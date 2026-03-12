import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  logAuthDiagnostic,
} from "@/lib/auth/diagnostics";
import { updateSession } from "@/lib/supabase/middleware";

/** ตรวจว่ามี Supabase auth cookie (JWT/session อยู่ใน cookie) หรือไม่ */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  return cookies.some((c) => /^sb-[^-]+-auth-token$/i.test(c.name));
}

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

  // ชั้นที่ 1: หน้า protected ต้องมี auth cookie (ไม่มีคุกกี้ = ยังไม่เคย login)
  if (isProtected && !hasSupabaseAuthCookie(request)) {
    logAuthDiagnostic("warn", "middleware.protected.redirect_to_login", request, {
      reason: "no_auth_cookie",
      redirectTo: "/login",
      from: pathname,
    });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const { response, userId, claimsSub } = await updateSession(request);

  if (!isProtected) {
    return response;
  }

  // ชั้นที่ 2: ต้องมี session ที่ valid จาก Supabase (getUser ผ่าน JWT ใน cookie)
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
  // /api/build-info เป็น public สำหรับเช็คเวอร์ชันและ QA
  matcher: [
    "/",
    "/login",
    "/register",
    "/api/build-info",
    "/projects",
    "/projects/(.*)",
    "/profile",
    "/profile/(.*)",
    "/tickets",
    "/tickets/(.*)",
    "/epics",
    "/epics/(.*)",
  ],
};


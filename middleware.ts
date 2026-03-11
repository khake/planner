import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getDiagnosticErrorPayload,
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

  if (!isProtected) {
    return updateSession(request);
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let claimsSub: string | undefined;

  try {
    // อย่าแทรก logic ระหว่าง createServerClient กับการ validate session
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      logAuthDiagnostic("warn", "middleware.protected.claims_error", request, {
        error: getDiagnosticErrorPayload(error),
      });
    }

    claimsSub = data?.claims?.sub;
  } catch (error) {
    logAuthDiagnostic("error", "middleware.protected.claims_exception", request, {
      error: getDiagnosticErrorPayload(error),
    });
  }

  if (!claimsSub) {
    logAuthDiagnostic("warn", "middleware.protected.redirect_to_login", request, {
      reason: "missing_claims_sub",
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


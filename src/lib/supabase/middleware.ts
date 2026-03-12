import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getDiagnosticErrorPayload,
  logAuthDiagnostic,
} from "@/lib/auth/diagnostics";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
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

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // สำคัญมากสำหรับ SSR: ให้ middleware เป็นจุดกลางในการ refresh/validate session
  let claimsSub: string | undefined;
  let userId: string | undefined;
  let hasRefreshError = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      const err = error as { code?: string; message?: string };
      if (
        err?.code === "refresh_token_not_found" ||
        err?.code === "invalid_refresh_token" ||
        err?.message?.includes("Refresh Token")
      ) {
        hasRefreshError = true;
      }
      logAuthDiagnostic("warn", "middleware.public.refresh_failed", request, {
        error: getDiagnosticErrorPayload(error),
      });
    }
    claimsSub = data?.claims?.sub;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === "refresh_token_not_found" ||
      err?.code === "invalid_refresh_token" ||
      err?.message?.includes("Refresh Token")
    ) {
      hasRefreshError = true;
    }
    logAuthDiagnostic("warn", "middleware.public.refresh_exception", request, {
      error: getDiagnosticErrorPayload(error),
    });
  }

  const authCookieNames = request.cookies
    .getAll()
    .filter((c) => /^sb-.*-auth-token/i.test(c.name))
    .map((c) => c.name);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      const err = error as { code?: string; message?: string };
      if (
        err?.code === "refresh_token_not_found" ||
        err?.code === "invalid_refresh_token" ||
        err?.message?.includes("Refresh Token") ||
        err?.message?.includes("Auth session missing")
      ) {
        hasRefreshError = true;
      }
      // ไม่ log เมื่อไม่มี cookie และเป็น Auth session missing (ผู้เยี่ยมชมหน้า public ปกติ)
      const isNoSessionNoCookie =
        authCookieNames.length === 0 && err?.message?.includes("Auth session missing");
      if (!isNoSessionNoCookie) {
        logAuthDiagnostic("warn", "middleware.public.get_user_error", request, {
          error: getDiagnosticErrorPayload(error),
        });
      }
    }
    userId = user?.id;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === "refresh_token_not_found" ||
      err?.code === "invalid_refresh_token" ||
      err?.message?.includes("Refresh Token") ||
      err?.message?.includes("Auth session missing")
    ) {
      hasRefreshError = true;
    }
    const isNoSessionNoCookie =
      authCookieNames.length === 0 && err?.message?.includes("Auth session missing");
    if (!isNoSessionNoCookie) {
      logAuthDiagnostic("warn", "middleware.public.get_user_exception", request, {
        error: getDiagnosticErrorPayload(error),
      });
    }
  }

  // ล้าง cookie ที่ไม่ valid เพื่อไม่ให้ retry วนซ้ำทุก request
  if (hasRefreshError) {
    await supabase.auth.signOut({ scope: "local" });
  }

  return {
    response: supabaseResponse,
    userId,
    claimsSub,
  };
}


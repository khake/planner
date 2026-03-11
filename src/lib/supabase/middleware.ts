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
  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      logAuthDiagnostic("warn", "middleware.public.refresh_failed", request, {
        error: getDiagnosticErrorPayload(error),
      });
    }

    claimsSub = data?.claims?.sub;
  } catch (error) {
    logAuthDiagnostic("error", "middleware.public.refresh_exception", request, {
      error: getDiagnosticErrorPayload(error),
    });
  }

  let userId: string | undefined;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logAuthDiagnostic("warn", "middleware.public.get_user_error", request, {
        error: getDiagnosticErrorPayload(error),
      });
    }

    userId = user?.id;
  } catch (error) {
    logAuthDiagnostic("error", "middleware.public.get_user_exception", request, {
      error: getDiagnosticErrorPayload(error),
    });
  }

  return {
    response: supabaseResponse,
    userId,
    claimsSub,
  };
}


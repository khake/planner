import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  // login / register ไม่ต้องเช็ก session
  if (pathname === "/login" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/projects" || pathname.startsWith("/projects/") || pathname.startsWith("/profile");

  if (!isProtected) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/projects") {
      url.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/projects/:path*", "/profile"],
};


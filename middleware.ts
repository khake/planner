import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // หน้าแรกให้เข้าชมได้โดยไม่ต้อง login
  if (pathname === "/") {
    return NextResponse.next();
  }

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

  // paths เหล่านี้ต้อง login ก่อน (กด "ไปที่ Squads" แล้วจะถูกส่งไป login)
  const isProtected =
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile");

  if (!isProtected) {
    return NextResponse.next();
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // ต้อง run middleware ทุก path ที่อาจเป็น protected
  matcher: ["/", "/projects", "/projects/(.*)", "/profile", "/profile/(.*)"],
};


import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // อนุญาต assets/system path
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // หน้า login และ logout ไม่ต้องเช็ก session
  if (pathname === "/login" || pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/projects" || pathname.startsWith("/projects/");

  if (!isProtected) {
    return NextResponse.next();
  }

  const session = request.cookies.get("planner_auth")?.value;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/projects") {
      url.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*"],
};


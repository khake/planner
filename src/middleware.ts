import { NextResponse, type NextRequest } from "next/server";

/**
 * Simple auth guard using Supabase auth cookies.
 *
 * แนวคิด:
 * - ปล่อยให้เข้าหน้า public ได้: '/', '/login', '/register', ไฟล์ static, API บางส่วน
 * - สำหรับ path อื่น ถ้าไม่เจอ cookie auth ของ Supabase ให้ redirect ไปหน้า /login?from=...
 *
 * หมายเหตุ: ใช้การเช็กชื่อ cookie ที่ขึ้นต้นด้วย `sb-` และลงท้ายด้วย `-auth-token`
 * ซึ่งเป็นรูปแบบมาตรฐานของ Supabase auth cookie.
 */

function hasSupabaseAuthCookie(req: NextRequest): boolean {
  const cookies = req.cookies.getAll();
  return cookies.some((c) => /^sb-.*-auth-token$/.test(c.name));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // อนุญาต path ที่ไม่ต้องเช็ก auth
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/activity-log") || // ใช้ user แบบ optional
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets");

  if (isPublicPath) {
    return NextResponse.next();
  }

  // มี cookie auth → ปล่อยผ่าน
  if (hasSupabaseAuthCookie(req)) {
    return NextResponse.next();
  }

  // ไม่มี auth → redirect ไปหน้า login พร้อม from=...
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname + search);

  return NextResponse.redirect(loginUrl);
}

// ใช้ middleware กับทุก route ยกเว้น static assets ที่กรองไว้ด้านบน
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"],
};


import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const expectedUser = process.env.APP_LOGIN_USER ?? "";
  const expectedPass = process.env.APP_LOGIN_PASSWORD ?? "";

  const from = String(formData.get("from") ?? "") || "/projects";

  if (username === expectedUser && password === expectedPass && expectedUser && expectedPass) {
    const res = NextResponse.redirect(new URL(from, request.url));
    res.cookies.set("planner_auth", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "1");
  return NextResponse.redirect(url);
}


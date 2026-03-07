import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** ใช้เมื่อ Supabase คืน auth error (เช่น Refresh Token ไม่ถูกต้อง) — sign out แล้ว redirect ไป login */
export function isAuthError(err: unknown): boolean {
  if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "AuthApiError") return true;
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "";
  return /refresh token|invalid session|session expired/i.test(msg);
}

export async function handleAuthErrorAndRedirect(err: unknown): Promise<boolean> {
  if (!isAuthError(err)) return false;
  const supabase = createClient();
  await supabase.auth.signOut();
  const from = typeof window !== "undefined" ? window.location.pathname : "";
  const loginUrl = from ? `/login?from=${encodeURIComponent(from)}` : "/login";
  if (typeof window !== "undefined") window.location.href = loginUrl;
  return true;
}

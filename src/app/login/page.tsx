import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const resolved = await searchParams;
  const from = resolved?.from || "/projects";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(from);
  }

  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center p-4"><p className="text-muted-foreground">กำลังโหลด...</p></main>}>
      <LoginForm />
    </Suspense>
  );
}


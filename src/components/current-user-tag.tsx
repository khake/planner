import { createClient } from "@/lib/supabase/server";

export async function CurrentUserTag() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const email = data.user?.email ?? null;
  if (!email) return null;

  const short = email.split("@")[0] || email;

  return (
    <span
      className="text-xs text-muted-foreground max-w-[140px] truncate"
      title={email}
      aria-label={`ล็อกอินเป็น ${email}`}
    >
      {short}
    </span>
  );
}


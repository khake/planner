import { createClient } from "@/lib/supabase/server";

export async function CurrentUserTag() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const email = data.user?.email ?? null;
  if (!email) return null;

  const short = email.split("@")[0] || email;
  const initial = short.charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-2.5 py-1.5"
      title={email}
      aria-label={`ล็อกอินเป็น ${email}`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF1ED] text-xs font-semibold text-[#EE4D2D]">
        {initial}
      </span>
      <span className="max-w-[140px] truncate text-sm font-medium text-[#222222]">
        {short}
      </span>
    </div>
  );
}


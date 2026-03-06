import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectList } from "@/features/projects/components";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CurrentUserTag } from "@/components/current-user-tag";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // ถ้ายังไม่ได้ login ให้ส่งไปหน้า /login ก่อน
  if (!data.user) {
    redirect("/login?from=/projects");
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline">← หน้าแรก</Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <CurrentUserTag />
          <Link href="/profile">
            <Button variant="outline" size="sm">
              โปรไฟล์
            </Button>
          </Link>
          <Link href="/logout">
            <Button variant="ghost" size="sm">
              Logout
            </Button>
          </Link>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">Squads</h1>
      <ProjectList />
    </main>
  );
}

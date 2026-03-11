import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirectAuthenticatedUser } from "@/lib/auth/server";
import { BuildInfo } from "@/components/build-info";

export default async function HomePage() {
  await redirectAuthenticatedUser("/projects");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">Project tracking</h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Next.js 15 · Tailwind CSS · Shadcn UI · Supabase
      </p>
      <Link href="/projects">
        <Button>ไปที่โปรเจค</Button>
      </Link>
      <BuildInfo compact className="mt-6" />
    </main>
  );
}

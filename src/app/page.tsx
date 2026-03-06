import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">Jira Clone</h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        Next.js 15 · Tailwind CSS · Shadcn UI · Supabase
      </p>
      <Link href="/projects">
        <Button>ไปที่ Squads</Button>
      </Link>
    </main>
  );
}

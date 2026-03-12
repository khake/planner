import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirectAuthenticatedUser } from "@/lib/auth/server";
import { BuildInfo } from "@/components/build-info";
import { LayoutDashboard } from "lucide-react";

export default async function HomePage() {
  await redirectAuthenticatedUser("/projects");

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24">
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#EE4D2D]/10 text-[#EE4D2D] mb-2">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#222222] tracking-tight">
            Project tracking
          </h1>
          <p className="text-[#666666] text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            จัดการ backlog, sprint และงานของทีมในที่เดียว
            <span className="block mt-1 text-sm text-[#888888]">
              Next.js · Tailwind · Supabase
            </span>
          </p>
          <div className="pt-2">
            <Link href="/projects">
              <Button size="lg" className="min-w-[200px] shadow-md hover:shadow-lg transition-shadow">
                ไปที่โปรเจค
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <footer className="py-4 flex justify-center">
        <BuildInfo compact className="text-[#757575]" />
      </footer>
    </main>
  );
}

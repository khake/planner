import Link from "next/link";
import { ProjectList } from "@/features/projects/components";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">โปรเจกต์</h1>
        <Link href="/">
          <Button variant="outline">กลับหน้าแรก</Button>
        </Link>
      </div>
      <ProjectList />
    </main>
  );
}

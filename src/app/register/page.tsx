"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // หลังสมัครเสร็จให้พาไปหน้า login
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-sm border border-[#E8E8E8] bg-card text-card-foreground p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <h1 className="text-xl font-semibold mb-4 text-center">ลงทะเบียนผู้ใช้</h1>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          สร้างบัญชีสำหรับใช้งาน Squads Board
        </p>
        {error && (
          <p className="text-sm text-destructive mb-3 text-center" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name">ชื่อที่ใช้แสดง</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="เช่น สมชาย ใจดี"
            />
          </div>
          <div>
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
          </Button>
        </form>
      </div>
    </main>
  );
}


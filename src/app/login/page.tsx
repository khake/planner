"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card text-card-foreground p-6 shadow-lg">
        <h1 className="text-xl font-semibold mb-4 text-center">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          ใส่ชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ Squads Board
        </p>
        {error && (
          <p className="text-sm text-destructive mb-3 text-center">
            ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
          </p>
        )}
        <form
          method="POST"
          action="/api/login"
          className="space-y-4"
          onSubmit={() => setSubmitting(true)}
        >
          <div>
            <Label htmlFor="username">ชื่อผู้ใช้</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </div>
    </main>
  );
}


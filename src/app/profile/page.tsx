"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: auth }, { data: profiles }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*").limit(1),
      ]);
      if (!auth.user) {
        router.push("/login");
        return;
      }
      setEmail(auth.user.email ?? "");
      if (profiles && profiles.length > 0) {
        const p = profiles[0] as Profile;
        setProfile(p);
        setName(p.name ?? "");
      }
    };
    load();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("บันทึกโปรไฟล์เรียบร้อยแล้ว");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setSavingPassword(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNewPassword("");
    setMessage("อัปเดตรหัสผ่านเรียบร้อยแล้ว");
  };

  return (
    <main className="container mx-auto py-8 px-4 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">โปรไฟล์ผู้ใช้</h1>
      {error && (
        <p className="text-sm text-destructive mb-3" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-600 mb-3" role="status">
          {message}
        </p>
      )}

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold">ข้อมูลพื้นฐาน</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label>อีเมล</Label>
            <Input value={email} disabled className="mt-1 bg-muted" />
          </div>
          <div>
            <Label htmlFor="name">ชื่อที่ใช้แสดง</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "กำลังอัปเดต..." : "อัปเดตรหัสผ่าน"}
          </Button>
        </form>
      </section>
    </main>
  );
}


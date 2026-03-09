"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

export function ProfilePageClient() {
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
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      setEmail(auth.user.email ?? "");
      if (profileData) {
        const p = profileData as Profile;
        setProfile(p);
        setName(p.name ?? "");
      }
    };
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (saveError) {
      setError(saveError.message);
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
    const { error: saveError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setNewPassword("");
    setMessage("อัปเดตรหัสผ่านเรียบร้อยแล้ว");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E8E8E8] bg-white px-6 py-5">
        <p className="text-sm font-medium text-[#EE4D2D]">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold text-[#222222]">โปรไฟล์ผู้ใช้</h1>
        <p className="mt-2 text-sm text-[#666666]">
          จัดการข้อมูลพื้นฐาน ชื่อที่ใช้แสดง และความปลอดภัยของบัญชี
        </p>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          {message}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#222222]">ข้อมูลพื้นฐาน</h2>
        <div className="rounded-xl border border-[#E8E8E8] bg-white p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อที่ใช้แสดง</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#222222]">เปลี่ยนรหัสผ่าน</h2>
        <div className="rounded-xl border border-[#E8E8E8] bg-white p-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "กำลังอัปเดต..." : "อัปเดตรหัสผ่าน"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

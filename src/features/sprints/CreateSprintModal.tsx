"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSprint } from "./createSprint";

type CreateSprintModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingSprintNames: string[];
  onSuccess: () => void;
};

export function CreateSprintModal({
  open,
  onClose,
  projectId,
  existingSprintNames,
  onSuccess,
}: CreateSprintModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const supabase = createClient();
    const result = await createSprint(
      supabase,
      projectId,
      {
        name,
        start_date: startDate || null,
        end_date: endDate || null,
        goal: goal || null,
      },
      existingSprintNames
    );
    setCreating(false);
    if (result.success) {
      setName("");
      setStartDate("");
      setEndDate("");
      setGoal("");
      onSuccess();
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">สร้าง Sprint ใหม่</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div>
            <Label htmlFor="sprint-name">ชื่อ Sprint</Label>
            <Input
              id="sprint-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Sprint 3"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="sprint-start">วันเริ่ม (ไม่บังคับ)</Label>
            <Input
              id="sprint-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sprint-end">วันสิ้นสุด (ไม่บังคับ)</Label>
            <Input
              id="sprint-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sprint-goal">Sprint Goal (ไม่บังคับ)</Label>
            <textarea
              id="sprint-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="เป้าหมายของสปรินท์นี้..."
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "กำลังสร้าง..." : "สร้าง Sprint"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

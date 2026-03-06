import type { LucideIcon } from "lucide-react";
import { BookOpenText, Bug, CheckSquare, ListTree } from "lucide-react";
import type { TaskType } from "@/types";

type TaskTypeMeta = {
  label: string;
  icon: LucideIcon;
  indicatorClassName: string;
  badgeClassName: string;
};

const TASK_TYPE_META: Record<TaskType, TaskTypeMeta> = {
  story: {
    label: "Story",
    icon: BookOpenText,
    indicatorClassName: "bg-emerald-50 text-emerald-600",
    badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  task: {
    label: "Task",
    icon: CheckSquare,
    indicatorClassName: "bg-blue-50 text-blue-600",
    badgeClassName: "border border-blue-200 bg-blue-50 text-blue-700",
  },
  bug: {
    label: "Bug",
    icon: Bug,
    indicatorClassName: "bg-rose-50 text-rose-600",
    badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
  },
  subtask: {
    label: "Subtask",
    icon: ListTree,
    indicatorClassName: "bg-slate-100 text-slate-600",
    badgeClassName: "border border-slate-200 bg-slate-100 text-slate-700",
  },
};

const TAG_TONES = [
  "border-[#FCD5CC] bg-[#FFF1ED] text-[#EE4D2D]",
  "border-[#D6E4FF] bg-[#EEF4FF] text-[#2563EB]",
  "border-[#D7F0DD] bg-[#ECFDF3] text-[#15803D]",
  "border-[#FCE7F3] bg-[#FDF2F8] text-[#BE185D]",
  "border-[#E9D5FF] bg-[#F5F3FF] text-[#7C3AED]",
] as const;

export function getTaskTypeMeta(type: TaskType) {
  return TASK_TYPE_META[type] ?? TASK_TYPE_META.task;
}

export function getTagClassName(tag: string) {
  const hash = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_TONES[hash % TAG_TONES.length];
}

export function normalizeTaskTag(rawTag: string) {
  return rawTag.trim().replace(/\s+/g, "-").toLowerCase();
}

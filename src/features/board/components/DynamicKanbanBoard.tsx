"use client";

import dynamic from "next/dynamic";
import type { KanbanBoardProps } from "./KanbanBoard";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((m) => ({ default: m.KanbanBoard })),
  {
    loading: () => (
      <p className="text-muted-foreground py-8">กำลังโหลดบอร์ด...</p>
    ),
  }
);

export function DynamicKanbanBoard(props: KanbanBoardProps) {
  return <KanbanBoard {...props} />;
}

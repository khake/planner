"use client";

import dynamic from "next/dynamic";
import type { BacklogBoardProps } from "./BacklogBoard";

const BacklogBoard = dynamic(
  () => import("./BacklogBoard").then((m) => ({ default: m.BacklogBoard })),
  {
    loading: () => (
      <p className="text-muted-foreground py-8">กำลังโหลด Backlog...</p>
    ),
  }
);

export function DynamicBacklogBoard(props: BacklogBoardProps) {
  return <BacklogBoard {...props} />;
}

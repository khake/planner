"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** คลิก overlay แล้วปิด (default: true) */
  closeOnOverlayClick?: boolean;
  /** max width: sm (24rem), md (28rem), lg (32rem) */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  children,
  closeOnOverlayClick = true,
  size = "sm",
  className,
}: ModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full rounded-xl border border-[#E8E8E8] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.08)]",
          sizeClass[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

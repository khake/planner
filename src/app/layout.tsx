import type { Metadata } from "next";
import { ToastProvider } from "@/contexts/ToastContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jira Clone",
  description: "Jira Clone built with Next.js 15, Tailwind, Shadcn UI & Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

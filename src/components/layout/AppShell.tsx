import type { ReactNode } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { BottomNav } from "@/components/nav/BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-canvas">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-6 md:pb-12 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

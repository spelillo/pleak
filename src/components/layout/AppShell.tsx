import type { ReactNode } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { BottomNav } from "@/components/nav/BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-page">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))] md:px-6 md:pb-16 md:pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

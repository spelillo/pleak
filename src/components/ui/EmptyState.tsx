import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-canvas px-6 py-12 text-center shadow-[var(--shadow-sm)]">
      <div className="mb-1 flex size-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mb-2 max-w-xs text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

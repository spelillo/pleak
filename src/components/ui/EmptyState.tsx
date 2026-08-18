import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hairline px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-card text-brand-blue">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-xs text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

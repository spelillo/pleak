import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/**
 * The steps of a multi-step flow as one connected path: numbered nodes on a
 * single line, so they read as a start, an end and a clear next step rather
 * than separate things. Done steps fill in, and the line fills up to the
 * current step.
 */
export function StepTrack({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  const last = steps.length - 1;
  const progress = last > 0 ? Math.min(1, Math.max(0, current / last)) : 0;
  return (
    <ol
      className={cn("relative flex justify-between", className)}
      aria-label={`Step ${Math.min(current, last) + 1} of ${steps.length}`}
    >
      {/* The line runs between the first and last node centers. */}
      <span
        aria-hidden
        className="absolute top-3 h-0.5 rounded-pill bg-surface-strong"
        style={{ left: `calc(100% / ${steps.length} / 2)`, right: `calc(100% / ${steps.length} / 2)` }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-pill bg-brand-blue transition-[width] duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </span>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className="relative z-10 flex flex-1 flex-col items-center gap-1.5"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-brand-blue text-on-primary",
                active && "bg-canvas text-brand-blue ring-2 ring-brand-blue",
                !done && !active && "bg-canvas text-muted ring-2 ring-surface-strong",
              )}
            >
              {done ? <Check size={12} weight="bold" /> : i + 1}
            </span>
            <span className={cn("text-xs", active ? "font-semibold text-ink" : "text-muted")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "blue" | "gold" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-surface-card text-muted",
  blue: "bg-brand-blue/12 text-brand-blue",
  gold: "bg-brand-gold/20 text-[#7a6000] dark:text-brand-gold",
  purple: "bg-purple-500/12 text-purple-700 dark:text-purple-300",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "label-tracked inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

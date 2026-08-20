import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "blue" | "gold";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-surface-card text-muted",
  blue: "bg-brand-blue/10 text-brand-blue",
  gold: "bg-brand-gold/15 text-[#8a6d00]",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "label-tracked inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

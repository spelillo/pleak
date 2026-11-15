import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "soft" | "outline";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

// "outline" is the grouped-list card: a raised surface on the page, no
// border (the contrast with the page does the separating). "soft" is an
// inset fill, for content nested inside a card.
const variants: Record<Variant, string> = {
  soft: "bg-surface-soft",
  outline: "bg-canvas shadow-[var(--shadow-sm)]",
};

export function Card({ variant = "soft", className, ...props }: CardProps) {
  return <div className={cn("rounded-lg p-5", variants[variant], className)} {...props} />;
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "soft" | "outline";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  soft: "bg-surface-card",
  outline: "bg-canvas border border-hairline",
};

export function Card({ variant = "soft", className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg p-6", variants[variant], className)}
      {...props}
    />
  );
}

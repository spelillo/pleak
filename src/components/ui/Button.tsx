import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "text" | "icon";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold text-sm transition-colors duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-active rounded-md px-5 h-10",
  secondary:
    "bg-canvas text-ink border border-hairline hover:bg-surface-soft rounded-md px-5 h-10",
  text: "bg-transparent text-brand-blue hover:underline px-0 h-auto",
  icon: "bg-canvas text-ink border border-hairline hover:bg-surface-soft rounded-full size-9 shrink-0",
};

const sizes: Record<Size, string> = {
  md: "",
  sm: "text-xs h-8 px-3.5",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], variant !== "icon" && sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

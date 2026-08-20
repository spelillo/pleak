import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { springDefault } from "@/lib/motion";

type Variant = "primary" | "secondary" | "text" | "icon";
type Size = "md" | "sm";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold text-sm transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

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
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={springDefault}
      className={cn(base, variants[variant], variant !== "icon" && sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

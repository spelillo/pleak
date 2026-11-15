import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { springSnappy } from "@/lib/motion";

type Variant = "primary" | "secondary" | "text" | "icon";
type Size = "md" | "sm";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

// Feedback lands on pointer-down (whileTap + :active), not on release.
const base =
  "inline-flex select-none items-center justify-center gap-2 font-semibold text-sm transition-[background-color,opacity] duration-100 disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap";

const variants: Record<Variant, string> = {
  // Filled, tinted: the one prominent action on a screen.
  primary: "bg-primary text-on-primary active:bg-primary-active rounded-md px-5 h-11",
  // Gray fill with tint text (Apple's bordered style).
  secondary: "bg-surface-card text-brand-blue active:bg-surface-strong rounded-md px-5 h-11",
  // Plain: tint text only, dims on press.
  text: "bg-transparent text-brand-blue active:opacity-50 px-0 h-auto",
  icon: "bg-surface-card text-ink active:bg-surface-strong rounded-full size-9 shrink-0",
};

const sizes: Record<Size, string> = {
  md: "",
  sm: "text-[0.8125rem] h-8 px-3.5 rounded-pill",
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
      whileTap={reduceMotion || variant === "text" ? undefined : { scale: 0.96 }}
      transition={springSnappy}
      className={cn(base, variants[variant], variant !== "icon" && sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

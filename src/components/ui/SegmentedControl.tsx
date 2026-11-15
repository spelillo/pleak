import { useId } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { springSnappy } from "@/lib/motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * iOS segmented control: the selection thumb slides between segments with
 * a critically damped spring, starting from wherever it is on screen, so a
 * quick second tap redirects it mid-flight instead of waiting.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const id = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-0.5 rounded-[10px] bg-surface-card p-0.5", className)}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-8 flex-1 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 text-[0.8125rem] font-medium transition-opacity duration-100 active:opacity-60",
              isSelected ? "text-ink" : "text-ink/70",
            )}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <motion.span
                layoutId={`segment-thumb-${id}`}
                className="absolute inset-0 rounded-[8px] bg-canvas shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]"
                transition={reduceMotion ? { duration: 0 } : springSnappy}
              />
            )}
            <span className={cn("relative flex items-center gap-1.5", isSelected && "font-semibold")}>
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

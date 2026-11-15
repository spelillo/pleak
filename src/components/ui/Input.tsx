import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-transparent bg-surface-card px-3.5 text-base text-ink placeholder:text-muted-soft",
        "outline-none transition-[border-color,box-shadow] duration-150 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15",
        className,
      )}
      {...props}
    />
  );
}

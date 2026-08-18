import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-sm text-ink placeholder:text-muted",
        "outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20",
        className,
      )}
      {...props}
    />
  );
}

import { cn } from "@/lib/cn";

interface PillTabsProps {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

export function PillTabs({ options, value, onChange, className }: PillTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-pill bg-surface-soft p-1.5", className)}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "label-tracked rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
              isSelected ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

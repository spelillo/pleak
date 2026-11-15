import { cn } from "@/lib/cn";
import { formatWeight, otherUnit } from "@/lib/units";
import { useWeightUnit } from "@/contexts/auth-context";

/**
 * A stored weight (pounds) in the person's preferred unit, with the other
 * unit beside it in smaller grey text: "60 kg  132.3 lb".
 */
export function WeightValue({ lb, className }: { lb: number; className?: string }) {
  const unit = useWeightUnit();
  return (
    <span className={cn("tabular whitespace-nowrap", className)}>
      {formatWeight(lb, unit)}
      <span className="ml-1.5 text-[0.8em] font-normal text-muted">{formatWeight(lb, otherUnit(unit))}</span>
    </span>
  );
}

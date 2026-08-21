import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { MOVEMENT_TYPES } from "@/lib/workoutGeneration";
import type { Exercise } from "@/lib/types";

interface ExercisePickerModalProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  title?: string;
}

const TYPE_OPTIONS = [
  { value: "weightlifting", label: "Weightlifting" },
  { value: "functional", label: "Functional" },
];

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
          : "border-hairline text-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function FilterRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <FilterChip label="All" active={value === null} onClick={() => onChange(null)} />
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
        />
      ))}
    </div>
  );
}

export function ExercisePickerModal({ exercises, onSelect, onClose, title }: ExercisePickerModalProps) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [movementFilter, setMovementFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const muscleOptions = useMemo(() => {
    const groups = new Set<string>();
    exercises.forEach((ex) => ex.muscleGroups.forEach((mg) => groups.add(mg)));
    return Array.from(groups)
      .sort()
      .map((mg) => ({ value: mg, label: mg }));
  }, [exercises]);

  const movementOptions = MOVEMENT_TYPES.map((m) => ({ value: m, label: m }));

  const normalizedQuery = query.trim().toLowerCase();
  const matches = exercises.filter((ex) => {
    if (normalizedQuery) {
      const haystack = `${ex.name} ${ex.muscleGroups.join(" ")}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    if (muscleFilter && !ex.muscleGroups.includes(muscleFilter)) return false;
    if (movementFilter && ex.movementType !== movementFilter) return false;
    if (typeFilter && ex.category !== typeFilter) return false;
    return true;
  });

  return (
    <Modal onClose={onClose} ariaLabel={title ?? "Choose an exercise"} className="max-w-lg">
      <div className="border-b border-hairline p-4">
        <p className="mb-3 text-base font-semibold text-ink">{title ?? "Choose an exercise"}</p>

        <div className="relative mb-3">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Muscle</p>
            <FilterRow options={muscleOptions} value={muscleFilter} onChange={setMuscleFilter} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Movement</p>
            <FilterRow options={movementOptions} value={movementFilter} onChange={setMovementFilter} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Type</p>
            <FilterRow options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {matches.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No matching exercises.</p>
        ) : (
          <ul>
            {matches.map((ex, i) => (
              <li key={ex.id} className={i > 0 ? "border-t border-hairline" : ""}>
                <button
                  type="button"
                  onClick={() => onSelect(ex)}
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-surface-soft"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ink">{ex.name}</span>
                    {ex.userId && <Badge tone="purple">Custom</Badge>}
                  </span>
                  {ex.muscleGroups.length > 0 && (
                    <span className="text-xs text-muted">{ex.muscleGroups.join(", ")}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

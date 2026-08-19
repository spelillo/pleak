import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import type { Exercise } from "@/lib/types";

interface ExercisePickerProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function matchesQuery(exercise: Exercise, query: string) {
  const haystack = `${exercise.name} ${exercise.muscleGroups.join(" ")}`.toLowerCase();
  return haystack.includes(query);
}

export function ExercisePicker({
  exercises,
  onSelect,
  placeholder = "Search exercises…",
  autoFocus,
}: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? exercises.filter((ex) => matchesQuery(ex, normalizedQuery)).slice(0, 8)
    : [];

  return (
    <div>
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          autoFocus={autoFocus}
        />
      </div>

      {normalizedQuery &&
        (matches.length === 0 ? (
          <p className="mt-2 px-1 text-xs text-muted">No matching exercises.</p>
        ) : (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-hairline">
            {matches.map((ex, i) => (
              <li key={ex.id} className={i > 0 ? "border-t border-hairline" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ex);
                    setQuery("");
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-soft"
                >
                  <span className="text-sm font-medium text-ink">{ex.name}</span>
                  {ex.muscleGroups.length > 0 && (
                    <span className="text-xs text-muted">{ex.muscleGroups.join(", ")}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

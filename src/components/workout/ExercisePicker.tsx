import { useState } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { CreateExerciseModal } from "@/components/workout/CreateExerciseModal";
import type { Exercise } from "@/lib/types";

interface ExercisePickerProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Shows a "Create exercise" button; a newly created exercise is selected. */
  allowCreate?: boolean;
  /** Shown before anything is typed, e.g. alternatives for a swap. */
  suggestions?: Exercise[];
  suggestionsLabel?: string;
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
  allowCreate,
  suggestions,
  suggestionsLabel,
}: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? exercises.filter((ex) => matchesQuery(ex, normalizedQuery)).slice(0, 8)
    : (suggestions ?? []).slice(0, 8);
  const showList = !!normalizedQuery || matches.length > 0;

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

      {!normalizedQuery && matches.length > 0 && suggestionsLabel && (
        <p className="mt-3 px-1 text-xs font-medium text-muted">{suggestionsLabel}</p>
      )}
      {showList &&
        (matches.length === 0 ? (
          <p className="mt-2 px-1 text-xs text-muted">No matching exercises.</p>
        ) : (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-md bg-surface-soft">
            {matches.map((ex, i) => (
              <li key={ex.id} className={i > 0 ? "border-t border-hairline" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ex);
                    setQuery("");
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-card active:bg-surface-strong"
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

      {allowCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-surface-card px-4 py-3 text-sm font-semibold text-brand-blue transition-[background-color,transform] duration-100 active:scale-[0.98] active:bg-surface-strong"
        >
          <Plus size={16} weight="bold" />
          {normalizedQuery && matches.length === 0 ? `Create “${query.trim()}”` : "Create new exercise"}
        </button>
      )}

      {showCreate && (
        <CreateExerciseModal
          initialName={normalizedQuery && matches.length === 0 ? query.trim() : ""}
          onCreated={(ex) => {
            setShowCreate(false);
            setQuery("");
            onSelect(ex);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

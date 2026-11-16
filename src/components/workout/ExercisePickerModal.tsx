import { useMemo, useState } from "react";
import { CaretDown, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CreateExerciseModal } from "@/components/workout/CreateExerciseModal";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/auth-context";
import { useWorkoutSessions } from "@/lib/queries/workoutSessions";
import { MOVEMENT_TYPES, type MovementType } from "@/lib/workoutGeneration";
import type { Exercise } from "@/lib/types";

interface ExercisePickerModalProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  title?: string;
  /** Shows a "Create exercise" row; a newly created exercise is selected. */
  allowCreate?: boolean;
  /** What a new exercise most likely is here, e.g. Push on a push day. */
  createDefaults?: { movementType?: MovementType; muscleGroups?: string[] };
}

// Choice overload: before the user narrows things down, show a short list
// (recently used first) instead of the whole library.
const RECENT_LIMIT = 6;
const BROWSE_LIMIT = 12;

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
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors active:opacity-60",
        active
          ? "bg-brand-blue text-white"
          : "bg-surface-card text-ink hover:bg-surface-strong",
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
    // Runs to the sheet's edges so the last visible chip is cut off by the
    // edge, which says the row scrolls.
    <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
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

export function ExercisePickerModal({
  exercises,
  onSelect,
  onClose,
  title,
  allowCreate,
  createDefaults,
}: ExercisePickerModalProps) {
  const { user } = useAuth();
  const { data: sessions } = useWorkoutSessions(user?.id);
  const [query, setQuery] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
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

  const isNarrowed = !!normalizedQuery || !!muscleFilter || !!movementFilter || !!typeFilter;

  // Most recently logged first.
  const recent = useMemo(() => {
    const byId = new Map(exercises.map((ex) => [ex.id, ex]));
    const seen = new Set<string>();
    const out: Exercise[] = [];
    const ordered = [...(sessions ?? [])].sort((a, b) => b.startTime.localeCompare(a.startTime));
    for (const session of ordered) {
      for (const ex of session.exercises) {
        const match = byId.get(ex.exerciseId);
        if (match && !seen.has(match.id)) {
          seen.add(match.id);
          out.push(match);
          if (out.length === RECENT_LIMIT) return out;
        }
      }
    }
    return out;
  }, [sessions, exercises]);

  const recentIds = new Set(recent.map((ex) => ex.id));
  const browse = isNarrowed ? matches : matches.filter((ex) => !recentIds.has(ex.id));
  const visible = isNarrowed || showAll ? browse : browse.slice(0, BROWSE_LIMIT);
  const hiddenCount = browse.length - visible.length;
  const moreFiltersOpen = showMoreFilters || !!movementFilter || !!typeFilter;

  const renderRow = (ex: Exercise, i: number) => (
    <li key={ex.id} className={i > 0 ? "border-t border-hairline" : ""}>
      <button
        type="button"
        onClick={() => onSelect(ex)}
        className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-surface-card active:bg-surface-strong"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-ink">{ex.name}</span>
          {ex.userId && <Badge tone="purple">Custom</Badge>}
        </span>
        {ex.muscleGroups.length > 0 && <span className="text-xs text-muted">{ex.muscleGroups.join(", ")}</span>}
      </button>
    </li>
  );

  return (
    <Modal onClose={onClose} ariaLabel={title ?? "Choose an exercise"} className="max-w-lg">
      <div className="px-5 pb-3 pt-5">
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
          <FilterRow options={muscleOptions} value={muscleFilter} onChange={setMuscleFilter} />
          {moreFiltersOpen ? (
            <>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Movement</p>
                <FilterRow options={movementOptions} value={movementFilter} onChange={setMovementFilter} />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Type</p>
                <FilterRow options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowMoreFilters(true)}
              className="flex items-center gap-1 self-start px-1 text-xs font-medium text-brand-blue active:opacity-60"
            >
              More filters
              <CaretDown size={12} weight="bold" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allowCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex w-full items-center gap-2 border-b border-hairline px-4 py-3 text-left text-sm font-semibold text-brand-blue transition-colors hover:bg-surface-card active:bg-surface-strong"
          >
            <Plus size={16} weight="bold" />
            {query.trim() && matches.length === 0 ? `Create “${query.trim()}”` : "Create exercise"}
          </button>
        )}
        {matches.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No matching exercises.</p>
        ) : (
          <>
            {!isNarrowed && recent.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted">Recent</p>
                <ul>{recent.map(renderRow)}</ul>
                <p className="border-t border-hairline px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted">
                  All exercises
                </p>
              </>
            )}
            <ul>{visible.map(renderRow)}</ul>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full border-t border-hairline px-4 py-3 text-left text-sm font-medium text-brand-blue transition-colors active:bg-surface-strong"
              >
                Show all {browse.length} exercises
              </button>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateExerciseModal
          initialName={matches.length === 0 ? query.trim() : ""}
          initialMuscleGroups={muscleFilter ? [muscleFilter] : createDefaults?.muscleGroups}
          initialMovementType={(movementFilter as MovementType | null) ?? createDefaults?.movementType}
          onCreated={(ex) => {
            setShowCreate(false);
            onSelect(ex);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </Modal>
  );
}

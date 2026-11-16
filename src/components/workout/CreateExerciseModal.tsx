import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, CaretRight, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { EXERCISE_NAME_MAX_LENGTH, normalizeExerciseName, validateExerciseName } from "@/lib/exerciseName";
import { findSimilarExercises } from "@/lib/exerciseMatch";
import { inferMovementType, MUSCLE_GROUPS } from "@/lib/muscleGroups";
import { useCreateExercise, useExercises, useUpdateExercise } from "@/lib/queries/exercises";
import { MOVEMENT_TYPES, type MovementType } from "@/lib/workoutGeneration";
import type { Exercise } from "@/lib/types";

interface CreateExerciseModalProps {
  /**
   * Called with the saved exercise, or with the existing library exercise
   * the user picked from "Did you mean…?" instead. The modal does not close
   * itself.
   */
  onCreated: (exercise: Exercise) => void;
  onClose: () => void;
  /** Prefills the name, e.g. with what the user was searching for. */
  initialName?: string;
  /** Prefills the muscles, e.g. the muscle the picker was filtered to. */
  initialMuscleGroups?: string[];
  /** Prefills the movement type, e.g. Push when planning a push day. */
  initialMovementType?: MovementType;
  /** Edit this custom exercise instead of creating a new one. */
  exercise?: Exercise;
}

function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}

function MuscleCheckbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors active:opacity-60",
        checked ? "bg-brand-blue/12 text-brand-blue" : "bg-surface-card text-ink",
      )}
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          checked ? "border-brand-blue bg-brand-blue text-white" : "border-muted-soft/60 bg-canvas",
        )}
      >
        {checked && <Check size={12} weight="bold" />}
      </span>
      {label}
    </label>
  );
}

/**
 * Create-exercise popup: name (letters only, profanity screened), one or
 * more muscle groups, and a Push / Pull / Legs movement type. Rendered in a
 * portal so it can open from inside another sheet.
 */
export function CreateExerciseModal({
  onCreated,
  onClose,
  initialName = "",
  initialMuscleGroups,
  initialMovementType,
  exercise: editing,
}: CreateExerciseModalProps) {
  const { data: allExercises } = useExercises();
  // When editing, the exercise itself doesn't count as a duplicate.
  const exercises = useMemo(
    () => (allExercises ?? []).filter((ex) => ex.id !== editing?.id),
    [allExercises, editing?.id],
  );
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const saveMutation = editing ? updateExercise : createExercise;
  const [name, setName] = useState(() => (editing?.name ?? initialName).replace(/[^\p{L} ]/gu, ""));
  const [nameTouched, setNameTouched] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<string[]>(editing?.muscleGroups ?? initialMuscleGroups ?? []);
  // Fill in what we already know: the context's movement type, or else the
  // one the chosen muscles point to. Once the user picks one, it's theirs.
  const [movementType, setMovementType] = useState<MovementType | "">(
    () => editing?.movementType ?? initialMovementType ?? inferMovementType(initialMuscleGroups ?? []) ?? "",
  );
  const [movementPicked, setMovementPicked] = useState(!!(editing?.movementType ?? initialMovementType));
  const [isChecking, setIsChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);
  // The name the user already said "create anyway" for, so we don't ask twice.
  const [confirmedName, setConfirmedName] = useState<string | null>(null);

  // The fixed list, plus anything else the library already uses.
  const muscleOptions = useMemo(() => {
    const extra = new Set<string>();
    exercises.forEach((ex) =>
      ex.muscleGroups.forEach((mg) => {
        if (!(MUSCLE_GROUPS as readonly string[]).includes(mg)) extra.add(mg);
      }),
    );
    return [...MUSCLE_GROUPS, ...Array.from(extra).sort()];
  }, [exercises]);

  const normalizedName = normalizeExerciseName(name);
  const nameError = validateExerciseName(name);
  const isDuplicate = exercises.some(
    (ex) => ex.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );
  const shownNameError = nameTouched && normalizedName ? (nameError ?? (isDuplicate ? "That exercise is already in your library." : null)) : null;
  const canSave = !nameError && !isDuplicate && muscleGroups.length > 0 && movementType !== "";

  function toggleMuscle(mg: string) {
    const next = muscleGroups.includes(mg) ? muscleGroups.filter((m) => m !== mg) : [...muscleGroups, mg];
    setMuscleGroups(next);
    if (!movementPicked) setMovementType(inferMovementType(next) ?? "");
  }

  function handleClose() {
    saveMutation.reset();
    onClose();
  }

  function selectedMuscles() {
    // Keep the list's order rather than the order they were tapped in.
    return muscleOptions.filter((mg) => muscleGroups.includes(mg));
  }

  async function handleSave() {
    setNameTouched(true);
    if (!canSave || isChecking) return;
    // New exercises are checked against the library first. (Edits aren't:
    // the exercise is already in use under its own id.)
    if (!editing && confirmedName !== normalizedName.toLowerCase()) {
      setIsChecking(true);
      const similar = await findSimilarExercises(
        { name: normalizedName, muscleGroups: selectedMuscles(), movementType },
        exercises,
      );
      setIsChecking(false);
      if (similar.length > 0) {
        setSuggestions(similar);
        return;
      }
    }
    await save();
  }

  async function save() {
    if (movementType === "") return;
    try {
      const saved = editing
        ? await updateExercise.mutateAsync({
            id: editing.id,
            name: normalizedName,
            muscleGroups: selectedMuscles(),
            movementType,
          })
        : await createExercise.mutateAsync({
            name: normalizedName,
            category: "weightlifting",
            exerciseType: "weights",
            muscleGroups: selectedMuscles(),
            movementType,
          });
      onCreated(saved);
    } catch {
      // Shown below via saveMutation.error.
    }
  }

  // React events bubble through portals, so keep pointer events from
  // reaching (and dragging) a sheet this one was opened from.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return createPortal(
    <div onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onPointerCancel={stop} onClick={stop}>
    <Modal onClose={handleClose} ariaLabel={editing ? "Edit exercise" : "Create exercise"} className="max-w-lg">
      <div className="px-5 pb-3 pt-5">
        <p className="text-base font-semibold text-ink">{editing ? "Edit exercise" : "Create exercise"}</p>
        <p className="text-xs text-muted">Only visible to you.</p>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mb-5">
            <FieldLabel htmlFor="create-exercise-name">Name</FieldLabel>
            <Input
              id="create-exercise-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              placeholder="e.g. Cable Y Raise"
              maxLength={EXERCISE_NAME_MAX_LENGTH + 10}
              autoComplete="off"
              autoCapitalize="words"
              aria-invalid={shownNameError ? true : undefined}
              aria-describedby="create-exercise-name-hint"
              autoFocus={!editing}
            />
            <p
              id="create-exercise-name-hint"
              className={cn("mt-1.5 text-xs", shownNameError ? "text-error" : "text-muted")}
            >
              {shownNameError ?? "Letters and spaces only."}
            </p>
          </div>

          <fieldset className="mb-5">
            <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Muscle groups
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {muscleOptions.map((mg) => (
                <MuscleCheckbox
                  key={mg}
                  label={mg}
                  checked={muscleGroups.includes(mg)}
                  onToggle={() => toggleMuscle(mg)}
                />
              ))}
            </div>
          </fieldset>

          <div>
            <FieldLabel htmlFor="create-exercise-movement">Movement type</FieldLabel>
            <div className="relative">
              <select
                id="create-exercise-movement"
                value={movementType}
                onChange={(e) => {
                  setMovementType(e.target.value as MovementType | "");
                  setMovementPicked(true);
                }}
                className={cn(
                  "h-11 w-full appearance-none rounded-md border border-transparent bg-surface-card pl-3.5 pr-10 text-base",
                  "outline-none transition-[border-color,box-shadow] duration-150 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15",
                  movementType === "" ? "text-muted-soft" : "text-ink",
                )}
              >
                <option value="" disabled>
                  Choose push, pull or legs
                </option>
                {MOVEMENT_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mt}
                  </option>
                ))}
              </select>
              <CaretDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-hairline p-4">
          {saveMutation.error && (
            <p className="mb-2 text-xs text-error">Couldn't save the exercise. Check your connection and try again.</p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!canSave || isChecking || saveMutation.isPending}
          >
            {isChecking ? "Checking the library…" : saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Save exercise"}
          </Button>
        </div>
      </form>
    </Modal>

    {suggestions.length > 0 && (
      <Modal onClose={() => setSuggestions([])} ariaLabel="Similar exercises found" className="max-w-sm">
        <div className="px-5 pb-3 pt-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Already in the library</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            {suggestions.length === 1 ? `Did you mean ${suggestions[0].name}?` : "Did you mean one of these?"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {suggestions.length === 1 ? "It" : "They"} look{suggestions.length === 1 ? "s" : ""} like “{normalizedName}”.
            Using the library version keeps your history in one place.
          </p>
        </div>
        <ul className="mx-4 divide-y divide-hairline overflow-hidden rounded-lg bg-surface-soft">
          {suggestions.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => {
                  setSuggestions([]);
                  onCreated(ex);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-surface-strong"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{ex.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[ex.muscleGroups.join(", "), ex.movementType].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-blue">
                  Use
                  <CaretRight size={14} weight="bold" />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 p-4">
          <Button
            variant="secondary"
            className="w-full"
            disabled={saveMutation.isPending}
            onClick={() => {
              setConfirmedName(normalizedName.toLowerCase());
              setSuggestions([]);
              void save();
            }}
          >
            No, create “{normalizedName}”
          </Button>
          <Button variant="text" className="mt-1 w-full justify-center" onClick={() => setSuggestions([])}>
            Go back and edit
          </Button>
        </div>
      </Modal>
    )}
    </div>,
    document.body,
  );
}

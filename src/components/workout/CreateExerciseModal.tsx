import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { EXERCISE_NAME_MAX_LENGTH, normalizeExerciseName, validateExerciseName } from "@/lib/exerciseName";
import { findSimilarExercise } from "@/lib/exerciseMatch";
import { MUSCLE_GROUPS } from "@/lib/muscleGroups";
import { useCreateExercise, useExercises } from "@/lib/queries/exercises";
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
export function CreateExerciseModal({ onCreated, onClose, initialName = "" }: CreateExerciseModalProps) {
  const { data: exercises } = useExercises();
  const createExercise = useCreateExercise();
  const [name, setName] = useState(() => initialName.replace(/[^\p{L} ]/gu, ""));
  const [nameTouched, setNameTouched] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [movementType, setMovementType] = useState<MovementType | "">("");
  const [isChecking, setIsChecking] = useState(false);
  const [suggestion, setSuggestion] = useState<Exercise | null>(null);
  // The name the user already said "create anyway" for, so we don't ask twice.
  const [confirmedName, setConfirmedName] = useState<string | null>(null);

  // The fixed list, plus anything else the library already uses.
  const muscleOptions = useMemo(() => {
    const extra = new Set<string>();
    (exercises ?? []).forEach((ex) =>
      ex.muscleGroups.forEach((mg) => {
        if (!(MUSCLE_GROUPS as readonly string[]).includes(mg)) extra.add(mg);
      }),
    );
    return [...MUSCLE_GROUPS, ...Array.from(extra).sort()];
  }, [exercises]);

  const normalizedName = normalizeExerciseName(name);
  const nameError = validateExerciseName(name);
  const isDuplicate = (exercises ?? []).some(
    (ex) => ex.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );
  const shownNameError = nameTouched && normalizedName ? (nameError ?? (isDuplicate ? "That exercise is already in your library." : null)) : null;
  const canSave = !nameError && !isDuplicate && muscleGroups.length > 0 && movementType !== "";

  function toggleMuscle(mg: string) {
    setMuscleGroups((prev) => (prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]));
  }

  function handleClose() {
    createExercise.reset();
    onClose();
  }

  function selectedMuscles() {
    // Keep the list's order rather than the order they were tapped in.
    return muscleOptions.filter((mg) => muscleGroups.includes(mg));
  }

  async function handleSave() {
    setNameTouched(true);
    if (!canSave || isChecking) return;
    if (confirmedName !== normalizedName.toLowerCase()) {
      setIsChecking(true);
      const similar = await findSimilarExercise(
        { name: normalizedName, muscleGroups: selectedMuscles(), movementType },
        exercises ?? [],
      );
      setIsChecking(false);
      if (similar) {
        setSuggestion(similar);
        return;
      }
    }
    await save();
  }

  async function save() {
    if (movementType === "") return;
    try {
      const created = await createExercise.mutateAsync({
        name: normalizedName,
        category: "weightlifting",
        exerciseType: "weights",
        muscleGroups: selectedMuscles(),
        movementType,
      });
      onCreated(created);
    } catch {
      // Shown below via createExercise.error.
    }
  }

  // React events bubble through portals, so keep pointer events from
  // reaching (and dragging) a sheet this one was opened from.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return createPortal(
    <div onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onPointerCancel={stop} onClick={stop}>
    <Modal onClose={handleClose} ariaLabel="Create exercise" className="max-w-lg">
      <div className="px-5 pb-3 pt-5">
        <p className="text-base font-semibold text-ink">Create exercise</p>
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
              autoFocus
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
                onChange={(e) => setMovementType(e.target.value as MovementType | "")}
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
          {createExercise.error && (
            <p className="mb-2 text-xs text-error">Couldn't save the exercise. Check your connection and try again.</p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!canSave || isChecking || createExercise.isPending}
          >
            {isChecking ? "Checking the library…" : createExercise.isPending ? "Saving…" : "Save exercise"}
          </Button>
        </div>
      </form>
    </Modal>

    {suggestion && (
      <Modal onClose={() => setSuggestion(null)} ariaLabel="Similar exercise found" className="max-w-sm">
        <div className="px-5 pb-2 pt-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Already in the library</p>
          <p className="mt-1 text-lg font-semibold text-ink">Did you mean {suggestion.name}?</p>
          <p className="mt-1 text-sm text-muted">
            {[suggestion.muscleGroups.join(", "), suggestion.movementType].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 text-sm text-body">
            It looks like the same movement as “{normalizedName}”. Use it to keep your history in one place.
          </p>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              const existing = suggestion;
              setSuggestion(null);
              onCreated(existing);
            }}
          >
            Use {suggestion.name}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={createExercise.isPending}
            onClick={() => {
              setConfirmedName(normalizedName.toLowerCase());
              setSuggestion(null);
              void save();
            }}
          >
            No, create “{normalizedName}”
          </Button>
          <Button variant="text" className="mt-1 w-full justify-center" onClick={() => setSuggestion(null)}>
            Go back and edit
          </Button>
        </div>
      </Modal>
    )}
    </div>,
    document.body,
  );
}

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { MOVEMENT_TYPES, type MovementType } from "@/lib/workoutGeneration";
import type { Exercise } from "@/lib/types";

interface CreateExerciseModalProps {
  exercises: Exercise[];
  onCreate: (input: {
    name: string;
    category: "weightlifting" | "functional";
    exerciseType: "weights";
    muscleGroups: string[];
    movementType?: MovementType;
  }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "weightlifting" as const, label: "Weightlifting" },
  { value: "functional" as const, label: "Functional" },
];

function SelectChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

export function CreateExerciseModal({ exercises, onCreate, onClose, isSaving }: CreateExerciseModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"weightlifting" | "functional">("weightlifting");
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<MovementType | null>(null);

  const muscleOptions = useMemo(() => {
    const groups = new Set<string>();
    exercises.forEach((ex) => ex.muscleGroups.forEach((mg) => groups.add(mg)));
    return Array.from(groups).sort();
  }, [exercises]);

  const canSave = name.trim().length > 0 && muscleGroup !== null && (category !== "weightlifting" || movementType !== null);

  function handleSave() {
    if (!canSave || !muscleGroup) return;
    onCreate({
      name: name.trim(),
      category,
      exerciseType: "weights",
      muscleGroups: [muscleGroup],
      movementType: category === "weightlifting" ? (movementType ?? undefined) : undefined,
    });
  }

  return (
    <Modal onClose={onClose} ariaLabel="Add a custom exercise" className="max-w-lg">
      <div className="border-b border-hairline p-4">
        <p className="text-base font-semibold text-ink">Add exercise</p>
        <p className="text-xs text-muted">Only visible to you.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Name</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cable Y-Raises"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectChip
                key={opt.value}
                label={opt.label}
                active={category === opt.value}
                onClick={() => {
                  setCategory(opt.value);
                  if (opt.value === "functional") setMovementType(null);
                }}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Muscle group</p>
          <div className="flex flex-wrap gap-1.5">
            {muscleOptions.map((mg) => (
              <SelectChip
                key={mg}
                label={mg}
                active={muscleGroup === mg}
                onClick={() => setMuscleGroup(muscleGroup === mg ? null : mg)}
              />
            ))}
          </div>
        </div>

        {category === "weightlifting" && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Movement</p>
            <div className="flex flex-wrap gap-1.5">
              {MOVEMENT_TYPES.map((mt) => (
                <SelectChip
                  key={mt}
                  label={mt}
                  active={movementType === mt}
                  onClick={() => setMovementType(movementType === mt ? null : mt)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-hairline p-4">
        <Button variant="primary" className="w-full" onClick={handleSave} disabled={!canSave || isSaving}>
          Save exercise
        </Button>
      </div>
    </Modal>
  );
}

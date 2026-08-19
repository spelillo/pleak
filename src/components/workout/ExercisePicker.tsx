import { useMemo, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { categoryLabel } from "@/lib/exerciseLabels";
import type { Exercise } from "@/lib/types";

interface ExercisePickerProps {
  exercises: Exercise[];
  onAdd: (exercise: Exercise) => void;
  placeholder?: string;
}

export function ExercisePicker({ exercises, onAdd, placeholder = "Add an exercise…" }: ExercisePickerProps) {
  const [pickedId, setPickedId] = useState("");

  const byCategory = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const group = groups.get(ex.category) ?? [];
      group.push(ex);
      groups.set(ex.category, group);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercises]);

  function handleAdd() {
    const picked = exercises.find((ex) => ex.id === pickedId);
    if (!picked) return;
    onAdd(picked);
    setPickedId("");
  }

  return (
    <div className="flex gap-2">
      <select
        value={pickedId}
        onChange={(e) => setPickedId(e.target.value)}
        className="h-10 w-full rounded-md border border-hairline bg-canvas px-3.5 text-sm text-ink outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
      >
        <option value="">{placeholder}</option>
        {byCategory.map(([cat, exs]) => (
          <optgroup key={cat} label={categoryLabel(cat)}>
            {exs.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <Button onClick={handleAdd} disabled={!pickedId}>
        <Plus size={16} weight="bold" />
        Add
      </Button>
    </div>
  );
}

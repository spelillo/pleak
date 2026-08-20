import { X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Modal } from "@/components/ui/Modal";
import { springDefault } from "@/lib/motion";
import { WORKOUT_TYPES, type WorkoutTypeOption } from "@/lib/workoutGeneration";

export function WorkoutTypeModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (type: WorkoutTypeOption) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Modal onClose={onClose} ariaLabel="Select workout type" className="max-w-md">
      <div className="flex items-center justify-between border-b border-hairline p-5">
        <h2 className="text-lg font-semibold text-ink">Select Workout Type</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-5">
        {WORKOUT_TYPES.map((type) => (
          <motion.button
            key={type.id}
            type="button"
            onClick={() => onSelect(type)}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={springDefault}
            className="rounded-lg border border-hairline bg-surface-soft px-4 py-4 text-left transition-colors hover:bg-surface-card"
          >
            <p className="text-base font-semibold text-ink">{type.label}</p>
            <p className="text-sm text-muted">{type.description}</p>
          </motion.button>
        ))}
      </div>
    </Modal>
  );
}

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { WarningCircle, X } from "@phosphor-icons/react";
import { springDefault } from "@/lib/motion";

// A transient error notice for actions that update the UI optimistically
// (before the backend confirms). Auto-dismisses so a failed background save
// doesn't linger forever if the user doesn't notice it.
export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onClose, 5000);
    return () => clearTimeout(timeout);
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={springDefault}
        >
          <div className="flex max-w-sm items-start gap-2.5 rounded-lg border border-error/30 bg-canvas/95 p-3.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-error" />
            <p className="text-sm text-ink">{message}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

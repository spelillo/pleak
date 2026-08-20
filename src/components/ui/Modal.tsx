import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { springDefault } from "@/lib/motion";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Modal({ onClose, children, className, ariaLabel }: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const reduceMotion = useReducedMotion();

  function requestClose() {
    setIsClosing(true);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const backdropTransition = { duration: reduceMotion ? 0.15 : 0.2 };
  const sheetTransition = reduceMotion ? { duration: 0.15 } : springDefault;
  const sheetHidden = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 };
  const sheetVisible = reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 pb-24 backdrop-blur-sm md:items-center md:pb-4"
      onClick={requestClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={backdropTransition}
      onAnimationComplete={() => {
        if (isClosing) onClose();
      }}
    >
      <motion.div
        className={cn(
          "flex max-h-[calc(100vh-7rem)] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-hairline/60 bg-canvas/90 shadow-[var(--shadow-lg)] backdrop-blur-xl md:max-h-[85vh]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        initial={sheetHidden}
        animate={isClosing ? sheetHidden : sheetVisible}
        transition={sheetTransition}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

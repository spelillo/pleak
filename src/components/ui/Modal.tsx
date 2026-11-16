import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControlsWithThen,
} from "motion/react";
import { cn } from "@/lib/cn";
import { projectMomentum, rubberband, springDefault, springSheet } from "@/lib/motion";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

// The sheet can be grabbed by its top strip (grabber + title row). Lower
// down, the pointer belongs to the sheet's own scrolling content.
const GRAB_ZONE_PX = 72;

function useIsCompact() {
  const query = "(max-width: 767px)";
  const [isCompact, setIsCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsCompact(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isCompact;
}

/**
 * On phones: a bottom sheet that tracks the finger 1:1, rubber-bands when
 * pulled up, and on release projects the flick's momentum to decide
 * between settling back and dismissing, handing the finger's velocity to
 * the spring so there's no seam. It can be grabbed again mid-animation.
 * On wider screens: a centered card that materializes in place.
 */
export function Modal({ onClose, children, className, ariaLabel }: ModalProps) {
  const reduceMotion = useReducedMotion();
  const isCompact = useIsCompact();
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetAnimation = useRef<AnimationPlaybackControlsWithThen | null>(null);
  const drag = useRef<{
    pointerId: number;
    startY: number;
    startOffset: number;
    history: { y: number; t: number }[];
  } | null>(null);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Sheet offset (px down from rest); 0 = fully presented.
  const y = useMotionValue(isCompact && !reduceMotion ? window.innerHeight : 0);
  // The scrim dims with the sheet's progress, so dragging it down
  // un-dims the page continuously instead of at the end.
  const sheetHeight = useRef(600);
  const scrimOpacity = useMotionValue(0);
  const scrim = useTransform(
    () => scrimOpacity.get() * Math.min(1, Math.max(0, 1 - y.get() / sheetHeight.current)),
  );

  const [presence, setPresence] = useState<"in" | "out">("in");

  useLayoutEffect(() => {
    if (sheetRef.current) sheetHeight.current = sheetRef.current.offsetHeight || 600;
  });

  // Present.
  useEffect(() => {
    const scrim = animate(scrimOpacity, 1, { duration: reduceMotion ? 0.15 : 0.25 });
    if (isCompact && !reduceMotion) sheetAnimation.current = animate(y, 0, springDefault);
    return () => {
      scrim.stop();
      sheetAnimation.current?.stop();
    };
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss(velocity = 0) {
    if (closing.current) return;
    closing.current = true;
    setPresence("out");
    const finish = () => onCloseRef.current();
    if (isCompact && !reduceMotion) {
      animate(scrimOpacity, 0, { duration: 0.25 });
      sheetAnimation.current?.stop();
      sheetAnimation.current = animate(y, sheetHeight.current + 40, { ...springDefault, velocity });
      sheetAnimation.current.then(finish);
    } else {
      animate(scrimOpacity, 0, { duration: 0.18 }).then(finish);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // With sheets stacked, Escape closes only the topmost one.
      const sheets = document.querySelectorAll("[data-sheet]");
      if (sheets.length > 0 && sheets[sheets.length - 1] !== sheetRef.current) return;
      dismiss();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompact, reduceMotion]);

  // Keep the page behind from scrolling while the sheet is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isCompact || reduceMotion || closing.current || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, button, a, [contenteditable]")) return;
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect || e.clientY - rect.top > GRAB_ZONE_PX) return;
    // Grabbing a sheet mid-flight stops the spring where it is on screen
    // and picks it up from there.
    sheetAnimation.current?.stop();
    // No text selection or native drag-and-drop from the grab strip.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: y.get(),
      history: [{ y: e.clientY, t: e.timeStamp }],
    };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const raw = d.startOffset + (e.clientY - d.startY);
    // 1:1 downward; rubber-band upward past the resting position.
    y.set(raw >= 0 ? raw : -rubberband(-raw, sheetHeight.current));
    d.history.push({ y: e.clientY, t: e.timeStamp });
    if (d.history.length > 6) d.history.shift();
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    // Velocity from the last ~100ms of movement, in px/s.
    // (A cancelled pointer reports no position, so use the last move.)
    const last = e.type === "pointercancel" ? d.history[d.history.length - 1] : { y: e.clientY, t: e.timeStamp };
    const recent = d.history.filter((p) => last.t - p.t < 100);
    const first = recent[0] ?? last;
    const dt = (last.t - first.t) / 1000;
    const velocity = dt > 0.008 ? (last.y - first.y) / dt : 0;

    // Decide from where the flick is heading, not where it was released.
    const projected = y.get() + projectMomentum(velocity);
    if (projected > sheetHeight.current * 0.5) {
      dismiss(velocity);
    } else {
      // Settle home, carrying the release velocity; a slight bounce
      // because a gesture with momentum preceded it.
      sheetAnimation.current = animate(y, 0, { ...springSheet, velocity });
    }
  }

  const sheetMotion = isCompact
    ? reduceMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: presence === "in" ? 1 : 0 },
          transition: { duration: 0.15 },
        }
      : {}
    : reduceMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: presence === "in" ? 1 : 0 },
          transition: { duration: 0.15 },
        }
      : {
          // Materialize: scale, blur and opacity arrive together.
          initial: { opacity: 0, scale: 0.94, filter: "blur(8px)" },
          animate:
            presence === "in"
              ? { opacity: 1, scale: 1, filter: "blur(0px)" }
              : { opacity: 0, scale: 0.96, filter: "blur(6px)" },
          transition: springDefault,
        };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
      {/* Figure and ground: the scrim takes the page behind from ~17:1
          text contrast down to ~2.5:1 (in both themes), so the sheet is the
          only thing competing for attention. Stacked sheets dim again. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/68"
        style={{ opacity: scrim }}
        onClick={() => dismiss()}
      />
      <motion.div
        ref={sheetRef}
        className={cn(
          "material-sheet relative flex w-full flex-col overflow-hidden shadow-[var(--shadow-lg)]",
          "max-h-[calc(100svh-2.5rem)] rounded-t-xl pb-[env(safe-area-inset-bottom)]",
          "md:max-h-[85vh] md:max-w-sm md:rounded-xl md:pb-0",
          className,
        )}
        data-sheet=""
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={isCompact && !reduceMotion ? { y } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        {...sheetMotion}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-1.5 md:hidden">
          <span className="h-[5px] w-9 rounded-pill bg-muted-soft/50" />
        </div>
        {children}
      </motion.div>
    </div>
  );
}

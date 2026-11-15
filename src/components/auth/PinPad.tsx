import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { Backspace, CaretLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

// A lock-screen style passcode pad: a row of dots that fill as digits are
// typed, a 3x4 grid of round keys, and a delete arrow. It fills the screen
// and also takes digits and Backspace from a hardware keyboard.

const KEYS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
] as const;

// Long enough for the last dot to visibly fill before the pad reacts.
const COMPLETE_DELAY_MS = 140;

interface PinPadProps {
  title: string;
  subtitle?: ReactNode;
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are in. */
  onComplete: (pin: string) => void;
  /** Shown under the dots in place of the subtitle. */
  error?: string | null;
  /** Bump to shake the dots (wrong PIN, PINs didn't match). */
  shakeKey?: number;
  busy?: boolean;
  onBack?: () => void;
  backLabel?: string;
  footer?: ReactNode;
}

export function PinPad({
  title,
  subtitle,
  length,
  value,
  onChange,
  onComplete,
  error,
  shakeKey = 0,
  busy = false,
  onBack,
  backLabel = "Back",
  footer,
}: PinPadProps) {
  const reduceMotion = useReducedMotion();
  const dots = useAnimationControls();

  // Latest values for the keyboard listener and completion timer, so neither
  // has to be re-registered on every keystroke.
  const latest = useRef({ value, busy, onChange, onComplete });
  latest.current = { value, busy, onChange, onComplete };

  function press(digit: string) {
    const { value: current, busy: isBusy, onChange: change } = latest.current;
    if (isBusy || current.length >= length) return;
    navigator.vibrate?.(8);
    change(current + digit);
  }

  function erase() {
    const { value: current, busy: isBusy, onChange: change } = latest.current;
    if (isBusy || current.length === 0) return;
    change(current.slice(0, -1));
  }

  useEffect(() => {
    if (value.length !== length) return;
    const timer = window.setTimeout(() => latest.current.onComplete(value), COMPLETE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [value, length]);

  useEffect(() => {
    if (shakeKey === 0) return;
    navigator.vibrate?.([30, 40, 30]);
    if (reduceMotion) return;
    // A damped side-to-side shake, like a rejected passcode.
    void dots.start({
      x: [0, -18, 15, -11, 8, -4, 0],
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }, [shakeKey, dots, reduceMotion]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        erase();
      } else if (e.key === "Escape" && onBack) {
        onBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // press/erase read from `latest`, so only onBack matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBack]);

  return (
    <div className="fixed inset-0 z-50 flex animate-materialize flex-col bg-page px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex h-11 items-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1.5 flex items-center gap-0.5 text-[17px] text-brand-blue transition-opacity active:opacity-50"
          >
            <CaretLeft size={22} weight="bold" />
            {backLabel}
          </button>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-xs flex-1 flex-col items-center justify-center gap-10 sm:flex-none sm:pt-[12vh]">
        <div className="flex flex-col items-center gap-5 text-center">
          <div>
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            <p
              className={cn("mt-1.5 min-h-5 text-sm", error ? "text-error" : "text-muted")}
              role={error ? "alert" : undefined}
              aria-live="polite"
            >
              {error ?? subtitle}
            </p>
          </div>

          <motion.div
            animate={dots}
            className="flex gap-[18px]"
            role="img"
            aria-label={`${value.length} of ${length} digits entered`}
          >
            {Array.from({ length }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "size-[13px] rounded-full border-[1.5px] border-ink transition-colors duration-100",
                  i < value.length ? "bg-ink" : "bg-transparent",
                  busy && "animate-pulse",
                )}
              />
            ))}
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-4" aria-busy={busy}>
          {KEYS.map(([digit, letters]) => (
            <Key key={digit} digit={digit} letters={letters} onPress={press} disabled={busy} />
          ))}
          <span />
          <Key digit="0" letters="" onPress={press} disabled={busy} />
          <button
            type="button"
            onClick={erase}
            disabled={busy || value.length === 0}
            aria-label="Delete"
            className="flex size-[78px] items-center justify-center rounded-full text-ink transition-opacity active:opacity-40 disabled:opacity-0"
          >
            <Backspace size={30} weight="regular" />
          </button>
        </div>
      </div>

      {footer && <div className="mx-auto mt-6 flex justify-center text-center sm:mt-10">{footer}</div>}
    </div>
  );
}

function Key({
  digit,
  letters,
  onPress,
  disabled,
}: {
  digit: string;
  letters: string;
  onPress: (digit: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      // Fire on pointer down like a real keypad, so fast typing never drops a digit.
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        onPress(digit);
      }}
      // Keyboard and assistive tech activate with click (pointer presses are
      // already handled above, and detail is 0 only for non-pointer clicks).
      onClick={(e) => {
        if (e.detail === 0) onPress(digit);
      }}
      disabled={disabled}
      aria-label={digit}
      className={cn(
        "flex size-[78px] select-none flex-col items-center justify-center rounded-full bg-surface-card text-ink",
        "transition-colors duration-300 active:bg-surface-strong active:duration-0 disabled:opacity-60",
        "[-webkit-tap-highlight-color:transparent] touch-manipulation",
      )}
    >
      <span className="text-[34px] font-light leading-none tabular-nums">{digit}</span>
      <span className="mt-0.5 h-2.5 text-[10px] font-semibold leading-none tracking-[0.18em] text-ink/80">
        {letters}
      </span>
    </button>
  );
}

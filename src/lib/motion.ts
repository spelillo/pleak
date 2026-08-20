import type { Transition } from "motion/react";

/** Critically damped — the default for anything the user can touch. No overshoot. */
export const springDefault: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 40,
};

/** A hair of bounce, reserved for momentum-carrying interactions (a flick, a throw). */
export const springMomentum: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.35,
};

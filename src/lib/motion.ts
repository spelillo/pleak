import type { Transition } from "motion/react";

// Springs use Motion's bounce + duration form, which maps onto Apple's
// damping ratio + response: bounce 0 is a damping ratio of 1.0.

/** Critically damped. The default for anything the user can touch: no overshoot. */
export const springDefault: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.35,
};

/** A hair of bounce, reserved for momentum-carrying interactions (a flick, a throw). */
export const springMomentum: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.35,
};

/** Drawers and sheets (Apple ships damping 0.8, response 0.3). */
export const springSheet: Transition = {
  type: "spring",
  bounce: 0.15,
  duration: 0.3,
};

/** Fast, flat spring for press feedback and selection thumbs. */
export const springSnappy: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.25,
};

/**
 * Where a flick will come to rest, using the same exponential-decay
 * projection as scroll deceleration (from Apple's Designing Fluid
 * Interfaces sample code). Velocity in px/s.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary, instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

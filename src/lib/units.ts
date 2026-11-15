// Weights are stored in pounds everywhere (sessions, PRs, body weight).
// The person's preferred unit only changes how weights are shown and typed,
// so switching units never rewrites saved data.

export type WeightUnit = "lb" | "kg";

const LB_PER_KG = 2.20462262;

export function otherUnit(unit: WeightUnit): WeightUnit {
  return unit === "lb" ? "kg" : "lb";
}

// Stored pounds -> number in `unit`, rounded to one decimal.
export function fromLb(lb: number, unit: WeightUnit): number {
  const value = unit === "kg" ? lb / LB_PER_KG : lb;
  return Math.round(value * 10) / 10;
}

// A number typed in `unit` -> pounds to store. Kept to two decimals so a
// kg value survives the round trip (100 kg -> 220.46 lb -> 100 kg).
export function toLb(value: number, unit: WeightUnit): number {
  const lb = unit === "kg" ? value * LB_PER_KG : value;
  return Math.round(lb * 100) / 100;
}

export function formatWeight(lb: number, unit: WeightUnit): string {
  return `${fromLb(lb, unit).toLocaleString()} ${unit}`;
}

// Stepper increment in the preferred unit: 5 lb plates or 2.5 kg plates.
export function weightIncrement(unit: WeightUnit): number {
  return unit === "kg" ? 2.5 : 5;
}

// Training volume (weight × reps) in `unit`, to the nearest whole number.
export function formatVolume(lb: number, unit: WeightUnit): string {
  return `${Math.round(fromLb(lb, unit)).toLocaleString()} ${unit}`;
}

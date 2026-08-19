const CATEGORY_LABELS: Record<string, string> = {
  weightlifting: "Weightlifting",
  functional: "Functional",
  cardio: "Cardio",
  "stretch-recovery": "Stretch & recovery",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

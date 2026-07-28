import type { Audience, MealType } from "@/lib/types";
import {
  AUDIENCE_LABELS,
  MEAL_CHIP_CLASS,
  MEAL_LABELS,
} from "@/lib/labels";

type Props = {
  meal: "" | MealType;
  audience: "" | Audience;
  onMealChange: (meal: "" | MealType) => void;
  onAudienceChange: (audience: "" | Audience) => void;
};

export function RecipeFilters({
  meal,
  audience,
  onMealChange,
  onAudienceChange,
}: Props) {
  const meals: { value: "" | MealType; label: string; pill: string }[] = [
    { value: "", label: "All meals", pill: "filter-pill-all" },
    { value: "breakfast", label: "Breakfast", pill: "filter-pill-breakfast" },
    { value: "lunch", label: "Lunch", pill: "filter-pill-lunch" },
    { value: "dinner", label: "Dinner", pill: "filter-pill-dinner" },
    { value: "snack", label: "Snack", pill: "filter-pill-snack" },
  ];

  const audiences: { value: "" | Audience; label: string; pill: string }[] = [
    { value: "", label: "Everyone", pill: "filter-pill-all" },
    { value: "cami", label: "Cami-friendly", pill: "filter-pill-cami" },
    { value: "adult", label: "Adult", pill: "filter-pill-adult" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
          Meal type
        </p>
        <div className="flex flex-wrap gap-2">
          {meals.map((m) => (
            <button
              key={m.value || "all"}
              type="button"
              className={`filter-pill ${m.pill} ${meal === m.value ? "filter-pill-active" : ""}`}
              onClick={() => onMealChange(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
          Who is it for?
        </p>
        <div className="flex flex-wrap gap-2">
          {audiences.map((a) => (
            <button
              key={a.value || "all"}
              type="button"
              className={`filter-pill ${a.pill} ${audience === a.value ? "filter-pill-active" : ""}`}
              onClick={() => onAudienceChange(a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MealChip({ mealType }: { mealType: MealType }) {
  return (
    <span className={`chip ${MEAL_CHIP_CLASS[mealType]}`}>
      {MEAL_LABELS[mealType]}
    </span>
  );
}

export function AudienceChip({ audience }: { audience: Audience }) {
  return (
    <span className={`chip chip-audience-${audience}`}>
      {AUDIENCE_LABELS[audience]}
    </span>
  );
}

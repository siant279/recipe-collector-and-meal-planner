import type { Recipe } from "@/lib/types";
import { AudienceChip, MealChip } from "@/components/RecipeFilters";

type Props = {
  recipe: Recipe;
  actions?: React.ReactNode;
  compact?: boolean;
  slotLabel?: string;
};

export function RecipeCard({ recipe, actions, compact, slotLabel }: Props) {
  const flags = recipe.choking_flags ?? [];

  return (
    <article className="surface fade-up flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {slotLabel ? (
            <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
              {slotLabel}
            </p>
          ) : null}
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold leading-snug text-[var(--ink)]">
            {recipe.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recipe.meal_type ? <MealChip mealType={recipe.meal_type} /> : null}
            {recipe.audience ? <AudienceChip audience={recipe.audience} /> : null}
            {recipe.source ? (
              <span className="chip" style={{ background: "rgba(45,27,61,0.08)", color: "var(--ink-soft)", textTransform: "none" }}>
                {recipe.source}
              </span>
            ) : null}
            {flags.length > 0 ? (
              <span className="chip chip-hazard" title={flags.join(", ")}>
                check prep · {flags.length}
              </span>
            ) : null}
          </div>
        </div>
        {actions}
      </div>

      {!compact ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Ingredients
              </h4>
              <ul className="space-y-1 text-sm text-[var(--ink)]">
                {(recipe.ingredients ?? []).map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Directions
              </h4>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-[var(--ink)]">
                {(recipe.directions ?? []).map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`}>
                    {line.replace(/^\d+\.\s*/, "")}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          {(recipe.optional_sides ?? []).length > 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--ink)]">Optional sides: </span>
              {recipe.optional_sides.join(" · ")}
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

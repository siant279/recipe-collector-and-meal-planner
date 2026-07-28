import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/types";
import { AudienceChip, MealChip } from "@/components/RecipeFilters";
import { RecipeDetailActions } from "@/components/RecipeDetailActions";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const recipe = data as Recipe;
  const flags = recipe.choking_flags ?? [];

  return (
    <article className="fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/browse"
          className="text-sm font-bold text-[var(--forest)] hover:underline"
        >
          ← Back to browse
        </Link>
        <h1 className="brand-mark mt-3 text-3xl sm:text-5xl">{recipe.title}</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.meal_type ? <MealChip mealType={recipe.meal_type} /> : null}
          {recipe.audience ? <AudienceChip audience={recipe.audience} /> : null}
          {recipe.source ? (
            <span
              className="chip"
              style={{
                background: "rgba(44,36,22,0.08)",
                color: "var(--ink-soft)",
                textTransform: "none",
              }}
            >
              {recipe.source}
            </span>
          ) : null}
          {flags.length > 0 ? (
            <span className="chip chip-hazard" title={flags.join(", ")}>
              check prep · {flags.join(", ")}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-soft)]">
          {recipe.servings ? <span>Servings: {recipe.servings}</span> : null}
          {recipe.prep_time ? <span>Prep: {recipe.prep_time}</span> : null}
          {recipe.cook_time ? <span>Cook: {recipe.cook_time}</span> : null}
          {recipe.source_url ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[var(--forest)] hover:underline"
            >
              Original source ↗
            </a>
          ) : null}
        </div>
      </div>

      <RecipeDetailActions recipe={recipe} />

      <div className="surface grid gap-8 p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-bold">
            Ingredients
          </h2>
          <ul className="space-y-2 text-[var(--ink)]">
            {(recipe.ingredients ?? []).map((line, i) => (
              <li key={`${i}-${line.slice(0, 32)}`} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--moss)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-bold">
            Directions
          </h2>
          <ol className="list-decimal space-y-3 pl-5 text-[var(--ink)]">
            {(recipe.directions ?? []).map((line, i) => (
              <li key={`${i}-${line.slice(0, 32)}`}>
                {line.replace(/^\d+\.\s*/, "")}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {(recipe.optional_sides ?? []).length > 0 ? (
        <div className="surface p-5">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold">
            Optional sides
          </h2>
          <p className="text-[var(--ink-soft)]">{recipe.optional_sides.join(" · ")}</p>
        </div>
      ) : null}
    </article>
  );
}

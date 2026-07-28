"use client";

import { useMemo, useState } from "react";
import type { Audience, MealType, Recipe } from "@/lib/types";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeFilters } from "@/components/RecipeFilters";
import { addToPlan } from "@/app/actions";
import { todayISO } from "@/lib/recipes";
import { MEAL_LABELS } from "@/lib/labels";

export function BrowseClient({ recipes }: { recipes: Recipe[] }) {
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<"" | MealType>("");
  const [audience, setAudience] = useState<"" | Audience>("");
  const [source, setSource] = useState("");
  const [hazard, setHazard] = useState<"all" | "safe" | "flagged">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const sources = useMemo(() => {
    return [...new Set(recipes.map((r) => r.source).filter(Boolean) as string[])].sort();
  }, [recipes]);

  const counts = useMemo(() => {
    const byMeal: Record<string, number> = { all: recipes.length };
    for (const r of recipes) {
      if (r.meal_type) byMeal[r.meal_type] = (byMeal[r.meal_type] ?? 0) + 1;
    }
    return byMeal;
  }, [recipes]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (meal && r.meal_type !== meal) return false;
      if (audience && r.audience !== audience) return false;
      if (source && r.source !== source) return false;
      if (hazard === "safe" && (r.choking_flags?.length ?? 0) > 0) return false;
      if (hazard === "flagged" && !(r.choking_flags?.length ?? 0)) return false;
      if (!query) return true;
      const hay = `${r.title} ${(r.ingredients ?? []).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [recipes, q, meal, audience, source, hazard]);

  async function onAdd(r: Recipe) {
    const slot = r.meal_type ?? "lunch";
    try {
      await addToPlan(r.id, slot, todayISO());
      setMsg(`Added ${r.title} to today’s plan`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="brand-mark text-3xl sm:text-4xl">Browse & search</h2>
        <p className="mt-2 text-[var(--ink-soft)]">
          {filtered.length} recipe{filtered.length === 1 ? "" : "s"}
          {meal ? ` · ${MEAL_LABELS[meal]}` : ""}
          {audience === "cami" ? " · Cami-friendly" : audience === "adult" ? " · Adult" : ""}
        </p>
        {msg ? <p className="mt-2 text-sm font-semibold text-[var(--forest)]">{msg}</p> : null}
      </div>

      <div className="surface mb-6 space-y-4 p-4">
        <RecipeFilters
          meal={meal}
          audience={audience}
          onMealChange={setMeal}
          onAudienceChange={setAudience}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or ingredients"
            className="rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2 outline-none ring-[var(--forest)] focus:ring-2 sm:col-span-2"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={hazard}
            onChange={(e) => setHazard(e.target.value as "all" | "safe" | "flagged")}
            className="rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
          >
            <option value="all">All hazard flags</option>
            <option value="safe">Hide flagged</option>
            <option value="flagged">Only flagged</option>
          </select>
        </div>
        <p className="text-xs text-[var(--ink-soft)]">
          Library: {counts.all ?? 0} total
          {counts.breakfast ? ` · ${counts.breakfast} breakfast` : ""}
          {counts.lunch ? ` · ${counts.lunch} lunch` : ""}
          {counts.dinner ? ` · ${counts.dinner} dinner` : ""}
          {counts.snack ? ` · ${counts.snack} snack` : ""}
        </p>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="surface p-6 text-center text-[var(--ink-soft)]">
            No recipes match these filters.
          </div>
        ) : (
          filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              compact={expanded !== r.id}
              actions={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    {expanded === r.id ? "Collapse" : "Details"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    onClick={() => onAdd(r)}
                  >
                    Add to plan
                  </button>
                </div>
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

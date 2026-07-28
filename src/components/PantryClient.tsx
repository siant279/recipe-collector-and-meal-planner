"use client";

import { useMemo, useState, useTransition } from "react";
import type { Audience, MealType, PantryItem, Recipe } from "@/lib/types";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeFilters } from "@/components/RecipeFilters";
import {
  addMissingToShop,
  addPantryItems,
  addToPlan,
  clearPantry,
  removePantryItem,
} from "@/app/actions";
import { todayISO } from "@/lib/recipes";
import { rankRecipesByPantry } from "@/lib/pantry-match";
import { MEAL_LABELS } from "@/lib/labels";

type Props = {
  pantry: PantryItem[];
  recipes: Recipe[];
};

export function PantryClient({ pantry, recipes }: Props) {
  const [chipInput, setChipInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [meal, setMeal] = useState<"" | MealType>("");
  const [audience, setAudience] = useState<"" | Audience>("");
  const [minScore, setMinScore] = useState(0.5);
  const [maxMissing, setMaxMissing] = useState(3);
  const [sessionOnly, setSessionOnly] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pantryTexts = useMemo(() => {
    const fromDb = pantry.map((p) => p.text);
    const fromSession = sessionOnly
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return [...fromDb, ...fromSession];
  }, [pantry, sessionOnly]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (meal && r.meal_type !== meal) return false;
      if (audience && r.audience !== audience) return false;
      return true;
    });
  }, [recipes, meal, audience]);

  const matches = useMemo(() => {
    if (!pantryTexts.length) return [];
    return rankRecipesByPantry(filteredRecipes, pantryTexts, {
      minScore,
      maxMissing,
    });
  }, [filteredRecipes, pantryTexts, minScore, maxMissing]);

  function onAddChip(e: React.FormEvent) {
    e.preventDefault();
    if (!chipInput.trim()) return;
    startTransition(async () => {
      const result = await addPantryItems(chipInput);
      setChipInput("");
      setMsg(
        result.added
          ? `Added to pantry`
          : `Already in pantry (or nothing new to add)`,
      );
    });
  }

  function onPaste(e: React.FormEvent) {
    e.preventDefault();
    if (!pasteInput.trim()) return;
    startTransition(async () => {
      const result = await addPantryItems(pasteInput);
      setPasteInput("");
      setMsg(`Saved ${result.added} item${result.added === 1 ? "" : "s"} to pantry`);
    });
  }

  return (
    <section>
      <div className="mb-6 max-w-2xl">
        <h2 className="brand-mark text-3xl sm:text-4xl">Pantry</h2>
        <p className="mt-2 text-[var(--ink-soft)]">
          What&apos;s in the kitchen? We&apos;ll rank recipes you can make (or almost make),
          ignoring staples like salt, oil, and spices.
        </p>
        {msg ? (
          <p className="mt-2 text-sm font-semibold text-[var(--forest)]">{msg}</p>
        ) : null}
      </div>

      <div className="surface mb-6 space-y-4 p-4 sm:p-5">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
            Saved pantry
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {pantry.length === 0 ? (
              <span className="text-sm text-[var(--ink-soft)]">Empty — add items below.</span>
            ) : (
              pantry.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip chip-audience-cami"
                  style={{ textTransform: "none", cursor: "pointer" }}
                  title="Remove"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await removePantryItem(item.id);
                    })
                  }
                >
                  {item.text} ×
                </button>
              ))
            )}
          </div>
          <form onSubmit={onAddChip} className="flex flex-wrap gap-2">
            <input
              value={chipInput}
              onChange={(e) => setChipInput(e.target.value)}
              placeholder="Add one ingredient…"
              className="min-w-[12rem] flex-1 rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2 outline-none ring-[var(--forest)] focus:ring-2"
            />
            <button type="submit" className="btn btn-primary text-sm" disabled={pending}>
              Add
            </button>
            {pantry.length > 0 ? (
              <button
                type="button"
                className="btn btn-danger text-sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!confirm("Clear the whole pantry?")) return;
                    await clearPantry();
                    setMsg("Pantry cleared");
                  })
                }
              >
                Clear all
              </button>
            ) : null}
          </form>
        </div>

        <form onSubmit={onPaste} className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
            Paste a list
          </p>
          <textarea
            rows={3}
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder={"chicken\ncarrots\nrice\n…or comma-separated"}
            className="w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2 outline-none ring-[var(--forest)] focus:ring-2"
          />
          <button type="submit" className="btn btn-secondary text-sm" disabled={pending}>
            Save list to pantry
          </button>
        </form>

        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
            One-off extras (not saved)
          </p>
          <input
            value={sessionOnly}
            onChange={(e) => setSessionOnly(e.target.value)}
            placeholder="Optional: leftover items just for this search…"
            className="w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2 outline-none ring-[var(--forest)] focus:ring-2"
          />
        </div>
      </div>

      <div className="surface mb-6 space-y-4 p-4">
        <RecipeFilters
          meal={meal}
          audience={audience}
          onMealChange={setMeal}
          onAudienceChange={setAudience}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Minimum match</span>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
            >
              <option value={0.4}>At least 40%</option>
              <option value={0.5}>At least 50%</option>
              <option value={0.7}>At least 70%</option>
              <option value={0.9}>At least 90%</option>
              <option value={1}>100% (everything on hand)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-bold">Max missing ingredients</span>
            <select
              value={maxMissing}
              onChange={(e) => setMaxMissing(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
            >
              <option value={0}>None missing</option>
              <option value={1}>Up to 1</option>
              <option value={2}>Up to 2</option>
              <option value={3}>Up to 3</option>
              <option value={5}>Up to 5</option>
              <option value={99}>Any</option>
            </select>
          </label>
        </div>
      </div>

      {!pantryTexts.length ? (
        <div className="surface p-6 text-[var(--ink-soft)]">
          Add pantry items to see matching recipes.
        </div>
      ) : matches.length === 0 ? (
        <div className="surface p-6 text-[var(--ink-soft)]">
          No recipes match these filters and thresholds. Try lowering the minimum match or
          raising max missing.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink-soft)]">
            {matches.length} recipe{matches.length === 1 ? "" : "s"}, best matches first
            {meal ? ` · ${MEAL_LABELS[meal]}` : ""}
            {audience === "cami" ? " · Cami-friendly" : audience === "adult" ? " · Adult" : ""}
          </p>
          {matches.map(({ match, ...recipe }) => {
            const pct = Math.round(match.score * 100);
            return (
              <div key={recipe.id} className="space-y-2">
                <RecipeCard
                  recipe={recipe}
                  compact={expanded !== recipe.id}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <span
                        className="chip"
                        style={{
                          background: "rgba(61, 107, 79, 0.18)",
                          color: "var(--forest)",
                          textTransform: "none",
                        }}
                      >
                        {pct}% · {match.matchedCount}/{match.requiredCount} on hand
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary text-sm"
                        onClick={() =>
                          setExpanded(expanded === recipe.id ? null : recipe.id)
                        }
                      >
                        {expanded === recipe.id ? "Collapse" : "Details"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary text-sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const slot = recipe.meal_type ?? "lunch";
                            await addToPlan(recipe.id, slot, todayISO());
                            setMsg(`Added ${recipe.title} to today’s plan`);
                          })
                        }
                      >
                        Add to plan
                      </button>
                    </div>
                  }
                />
                {match.missing.length > 0 ? (
                  <div className="ml-1 flex flex-wrap items-center gap-2 px-1 text-sm">
                    <span className="font-bold text-[var(--ink)]">Need:</span>
                    <span className="text-[var(--ink-soft)]">
                      {match.missing.join(" · ")}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await addMissingToShop(
                            match.missing,
                            recipe.id,
                          );
                          setMsg(
                            `Added ${result.added} missing item${result.added === 1 ? "" : "s"} to shopping list`,
                          );
                        })
                      }
                    >
                      Add missing to shop
                    </button>
                  </div>
                ) : (
                  <p className="ml-1 px-1 text-sm font-semibold text-[var(--forest)]">
                    You have everything (staples assumed).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

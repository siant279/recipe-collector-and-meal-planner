"use client";

import { useMemo, useState, useTransition } from "react";
import type { MealType, Recipe } from "@/lib/types";
import { MEAL_SLOTS, pickForSlot, todayISO } from "@/lib/recipes";
import { MEAL_LABELS } from "@/lib/labels";
import { RecipeCard } from "@/components/RecipeCard";
import { addToPlan } from "@/app/actions";

export function TodayPicks({ recipes }: { recipes: Recipe[] }) {
  const dateISO = todayISO();
  const camiRecipes = useMemo(
    () => recipes.filter((r) => r.audience === "cami" || r.audience == null),
    [recipes],
  );
  const [offsets, setOffsets] = useState<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    snack: 0,
    dinner: 0,
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const picks = useMemo(() => {
    return MEAL_SLOTS.map((slot) => ({
      slot,
      recipe: pickForSlot(camiRecipes, slot, dateISO, offsets[slot]),
    }));
  }, [camiRecipes, dateISO, offsets]);

  function shuffle(slot: MealType) {
    setOffsets((prev) => ({ ...prev, [slot]: prev[slot] + 1 }));
  }

  function onAdd(recipe: Recipe, slot: MealType) {
    startTransition(async () => {
      try {
        await addToPlan(recipe.id, slot, dateISO);
        setMessage(`Added ${recipe.title} to today’s ${slot}`);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not add to plan");
      }
    });
  }

  return (
    <section>
      <div className="mb-6 max-w-2xl">
        <h2 className="brand-mark text-3xl sm:text-5xl">Today&apos;s picks</h2>
        <p className="mt-2 text-[var(--ink-soft)]">
          Cami-friendly breakfast, lunch, snack & dinner for {dateISO}. Shuffle or add
          to the shared plan.
        </p>
        {message ? (
          <p className="mt-3 text-sm font-semibold text-[var(--forest)]">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-4">
        {picks.map(({ slot, recipe }, i) =>
          recipe ? (
            <div key={slot} style={{ animationDelay: `${i * 70}ms` }}>
              <RecipeCard
                recipe={recipe}
                compact
                slotLabel={MEAL_LABELS[slot]}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => shuffle(slot)}
                    >
                      Shuffle
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary text-sm hero-glow"
                      disabled={pending}
                      onClick={() => onAdd(recipe, slot)}
                    >
                      Add to plan
                    </button>
                  </div>
                }
              />
            </div>
          ) : (
            <div key={slot} className="surface p-5 text-[var(--ink-soft)]">
              No Cami-friendly {MEAL_LABELS[slot].toLowerCase()} recipes yet.
            </div>
          ),
        )}
      </div>
    </section>
  );
}

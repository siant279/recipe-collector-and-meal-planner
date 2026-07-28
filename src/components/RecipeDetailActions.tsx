"use client";

import { useState, useTransition } from "react";
import type { MealType, Recipe } from "@/lib/types";
import { addToPlan, addMissingToShop } from "@/app/actions";
import { todayISO } from "@/lib/recipes";
import { MEAL_LABELS } from "@/lib/labels";

export function RecipeDetailActions({ recipe }: { recipe: Recipe }) {
  const [mealType, setMealType] = useState<MealType>(recipe.meal_type ?? "lunch");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="surface space-y-3 p-4">
      <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--ink-soft)]">
        Actions
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-sm">
          <span className="font-bold">Plan as</span>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="mt-1 block rounded-xl border border-[var(--haze)] bg-white/80 px-3 py-2"
          >
            {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await addToPlan(recipe.id, mealType, todayISO());
              setMsg(`Added to today’s ${MEAL_LABELS[mealType].toLowerCase()}`);
            })
          }
        >
          Add to today’s plan
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending || !(recipe.ingredients?.length)}
          onClick={() =>
            startTransition(async () => {
              const result = await addMissingToShop(recipe.ingredients ?? [], recipe.id);
              setMsg(
                `Added ${result.added} ingredient${result.added === 1 ? "" : "s"} to shopping list`,
              );
            })
          }
        >
          Add ingredients to shop
        </button>
      </div>
      {msg ? <p className="text-sm font-semibold text-[var(--forest)]">{msg}</p> : null}
    </div>
  );
}

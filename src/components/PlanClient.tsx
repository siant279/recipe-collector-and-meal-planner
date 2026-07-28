"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import type { MealPlanRow, MealType } from "@/lib/types";
import { MEAL_SLOTS, todayISO } from "@/lib/recipes";
import { MealChip } from "@/components/RecipeFilters";
import { clearPlanSlot } from "@/app/actions";

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PlanClient({ rows }: { rows: MealPlanRow[] }) {
  const start = todayISO();
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start],
  );
  const [pending, startTransition] = useTransition();

  const byKey = useMemo(() => {
    const map = new Map<string, MealPlanRow>();
    for (const row of rows) {
      map.set(`${row.plan_date}|${row.meal_type}`, row);
    }
    return map;
  }, [rows]);

  function remove(date: string, meal: MealType) {
    startTransition(async () => {
      await clearPlanSlot(date, meal);
    });
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="brand-mark text-3xl sm:text-4xl">My plan</h2>
        <p className="mt-2 text-[var(--ink-soft)]">
          Shared week view — one recipe per meal slot. Both of you see the same plan.
        </p>
      </div>

      <div className="grid gap-4">
        {days.map((date) => (
          <div key={date} className="surface p-4 sm:p-5">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">
              {new Date(date + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
            <div className="mt-3 grid gap-2">
              {MEAL_SLOTS.map((meal) => {
                const row = byKey.get(`${date}|${meal}`);
                const recipe = row?.recipes;
                return (
                  <div
                    key={meal}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/45 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <MealChip mealType={meal} />
                      {recipe ? (
                        <Link
                          href={`/recipes/${recipe.id}`}
                          className="font-semibold hover:text-[var(--forest)] hover:underline"
                        >
                          {recipe.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-[var(--ink-soft)]">
                          — empty —
                        </span>
                      )}
                    </div>
                    {row ? (
                      <button
                        type="button"
                        className="btn btn-danger text-sm"
                        disabled={pending}
                        onClick={() => remove(date, meal)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

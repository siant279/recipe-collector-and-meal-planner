import type { MealType, Recipe } from "@/lib/types";

/** Deterministic string hash — matches the HTML prototype's dayHash. */
export function dayHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function todayISO(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function pickForSlot(
  recipes: Recipe[],
  mealType: MealType,
  dateISO: string,
  seedOffset = 0,
): Recipe | null {
  const pool = recipes.filter((r) => r.meal_type === mealType);
  if (!pool.length) return null;
  const seed = dayHash(dateISO + mealType + seedOffset);
  return pool[seed % pool.length] ?? null;
}

export const MEAL_SLOTS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function dedupeIngredients(lines: string[]): string[] {
  const seen = new Map<string, string>();
  for (const line of lines) {
    const cleaned = line.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) seen.set(key, cleaned);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

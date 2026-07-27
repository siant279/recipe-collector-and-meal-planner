/**
 * Seed recipes.json into Supabase using the service role key.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

type SeedRecipe = {
  title: string;
  source: string | null;
  meal_type: "breakfast" | "lunch" | "snack" | "dinner" | null;
  day: number | null;
  servings: string | null;
  prep_time: string | null;
  cook_time: string | null;
  ingredients: string[];
  directions: string[];
  optional_sides?: string[];
  choking_flags?: string[];
};

function mergeBrokenLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Continuation lines often start lowercase or with a unit-only fragment
    if (
      out.length &&
      (/^[a-z]/.test(trimmed) || /^(drained|minced|chopped|sliced),?$/i.test(trimmed))
    ) {
      out[out.length - 1] = `${out[out.length - 1]} ${trimmed}`.replace(/,\s*,/g, ",");
    } else {
      out.push(trimmed);
    }
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const path = resolve(process.cwd(), "recipes.json");
  const recipes = JSON.parse(readFileSync(path, "utf8")) as SeedRecipe[];

  const rows = recipes.map((r) => ({
    title: r.title,
    source: r.source,
    meal_type: r.meal_type,
    day: r.day,
    servings: r.servings,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    ingredients: mergeBrokenLines(r.ingredients ?? []),
    directions: mergeBrokenLines(r.directions ?? []),
    optional_sides: r.optional_sides ?? [],
    choking_flags: r.choking_flags ?? [],
  }));

  const { count } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    console.log(`recipes already has ${count} rows — skipping seed`);
    return;
  }

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("recipes").insert(chunk);
    if (error) throw error;
    console.log(`Inserted ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`);
  }

  console.log(`Seeded ${rows.length} recipes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

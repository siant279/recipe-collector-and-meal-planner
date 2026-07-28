import { createClient } from "@/lib/supabase/server";
import { PantryClient } from "@/components/PantryClient";
import type { PantryItem, Recipe } from "@/lib/types";

export default async function PantryPage() {
  const supabase = await createClient();
  const [{ data: pantry, error: pantryError }, { data: recipes, error: recipeError }] =
    await Promise.all([
      supabase.from("pantry_items").select("*").order("text"),
      supabase.from("recipes").select("*").order("title"),
    ]);

  if (pantryError || recipeError) {
    return (
      <p className="text-[var(--clay)]">
        {pantryError?.message ?? recipeError?.message}
        {!pantryError ? null : " — apply the pantry migration if you haven’t yet."}
      </p>
    );
  }

  return (
    <PantryClient
      pantry={(pantry ?? []) as PantryItem[]}
      recipes={(recipes ?? []) as Recipe[]}
    />
  );
}

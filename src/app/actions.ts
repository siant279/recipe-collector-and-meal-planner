"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MealType, ParsedRecipeDraft } from "@/lib/types";
import { dedupeIngredients } from "@/lib/recipes";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function addToPlan(recipeId: string, mealType: MealType, planDate: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("meal_plan").upsert(
    {
      plan_date: planDate,
      meal_type: mealType,
      recipe_id: recipeId,
      added_by: user.id,
    },
    { onConflict: "plan_date,meal_type" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/plan");
  revalidatePath("/today");
  revalidatePath("/shop");
}

export async function clearPlanSlot(planDate: string, mealType: MealType) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("meal_plan")
    .delete()
    .eq("plan_date", planDate)
    .eq("meal_type", mealType);
  if (error) throw new Error(error.message);
  revalidatePath("/plan");
  revalidatePath("/today");
}

export async function addShopItem(text: string, recipeId?: string | null) {
  const { supabase, user } = await requireUser();
  const cleaned = text.trim();
  if (!cleaned) return;
  const { error } = await supabase.from("shopping_list_items").insert({
    text: cleaned,
    recipe_id: recipeId ?? null,
    added_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/shop");
}

export async function toggleShopItem(id: string, checked: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/shop");
}

export async function removeShopItem(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/shop");
}

export async function generateShopFromPlan(fromDate: string, toDate: string) {
  const { supabase, user } = await requireUser();
  const { data: plan, error: planError } = await supabase
    .from("meal_plan")
    .select("recipe_id, recipes(ingredients)")
    .gte("plan_date", fromDate)
    .lte("plan_date", toDate);

  if (planError) throw new Error(planError.message);

  const lines: string[] = [];
  for (const row of plan ?? []) {
    const ingredients = (row.recipes as { ingredients?: string[] } | null)?.ingredients ?? [];
    lines.push(...ingredients);
  }

  const items = dedupeIngredients(lines);
  if (!items.length) return { added: 0 };

  const { data: existing } = await supabase
    .from("shopping_list_items")
    .select("text")
    .eq("checked", false);

  const existingKeys = new Set(
    (existing ?? []).map((i) => i.text.toLowerCase().replace(/\s+/g, " ").trim()),
  );

  const toInsert = items
    .filter((t) => !existingKeys.has(t.toLowerCase()))
    .map((text) => ({ text, added_by: user.id }));

  if (toInsert.length) {
    const { error } = await supabase.from("shopping_list_items").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/shop");
  return { added: toInsert.length };
}

export async function createTextSubmission(rawInput: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipe_submissions")
    .insert({
      raw_input: rawInput,
      input_type: "text",
      status: "pending",
      submitted_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/review");
  return data.id as string;
}

export async function createUrlSubmission(url: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipe_submissions")
    .insert({
      raw_input: url,
      input_type: "url",
      source_ref: url,
      status: "pending",
      submitted_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/review");
  return data.id as string;
}

export async function createFileSubmission(path: string, inputType: "pdf" | "image") {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("recipe_submissions")
    .insert({
      raw_input: path,
      input_type: inputType,
      source_ref: path,
      status: "pending",
      submitted_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/review");
  return data.id as string;
}

export async function approveSubmission(submissionId: string, draft?: ParsedRecipeDraft) {
  const { supabase, user } = await requireUser();
  const { data: sub, error: fetchError } = await supabase
    .from("recipe_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const parsed = (draft ?? sub.parsed_recipe) as ParsedRecipeDraft | null;
  if (!parsed?.title || !parsed.ingredients?.length) {
    throw new Error("Parsed recipe is incomplete");
  }

  const { data: recipe, error: insertError } = await supabase
    .from("recipes")
    .insert({
      title: parsed.title,
      source: parsed.source ?? null,
      meal_type: parsed.meal_type ?? null,
      servings: parsed.servings ?? null,
      prep_time: parsed.prep_time ?? null,
      cook_time: parsed.cook_time ?? null,
      ingredients: parsed.ingredients,
      directions: parsed.directions ?? [],
      optional_sides: parsed.optional_sides ?? [],
      choking_flags: parsed.choking_flags ?? [],
      tags: parsed.tags ?? [],
      source_url: parsed.source_url ?? sub.source_ref,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("recipe_submissions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      approved_recipe_id: recipe.id,
      parsed_recipe: parsed,
    })
    .eq("id", submissionId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/review");
  revalidatePath("/browse");
  revalidatePath("/today");
}

export async function rejectSubmission(submissionId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("recipe_submissions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/review");
}

export async function updateSubmissionDraft(
  submissionId: string,
  draft: ParsedRecipeDraft,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("recipe_submissions")
    .update({
      parsed_recipe: draft,
      status: "needs_review",
    })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/review");
}

import { createAdminClient } from "@/lib/supabase/middleware";
import { parseRecipeWithClaude } from "@/lib/parse-recipe";

/** Helper used when a background job has raw recipe text ready. */
export async function createSubmissionFromJob(opts: {
  raw: string;
  inputType: "email" | "drive_file";
  sourceRef?: string;
  parse?: boolean;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recipe_submissions")
    .insert({
      raw_input: opts.raw,
      input_type: opts.inputType,
      source_ref: opts.sourceRef ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (opts.parse) {
    try {
      const parsed = await parseRecipeWithClaude(opts.raw);
      await admin
        .from("recipe_submissions")
        .update({ parsed_recipe: parsed, status: "needs_review" })
        .eq("id", data.id);
    } catch (e) {
      await admin
        .from("recipe_submissions")
        .update({
          parse_error: e instanceof Error ? e.message : "parse failed",
        })
        .eq("id", data.id);
    }
  }

  return data.id as string;
}

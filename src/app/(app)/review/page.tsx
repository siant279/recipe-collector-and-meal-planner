import { createClient } from "@/lib/supabase/server";
import { ReviewClient } from "@/components/ReviewClient";
import type { RecipeSubmission } from "@/lib/types";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_submissions")
    .select("*")
    .in("status", ["pending", "parsed", "needs_review"])
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-[var(--clay)]">{error.message}</p>;
  }

  return <ReviewClient submissions={(data ?? []) as RecipeSubmission[]} />;
}

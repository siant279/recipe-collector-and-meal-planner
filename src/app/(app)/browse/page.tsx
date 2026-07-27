import { createClient } from "@/lib/supabase/server";
import { BrowseClient } from "@/components/BrowseClient";
import type { Recipe } from "@/lib/types";

export default async function BrowsePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select("*").order("title");
  if (error) {
    return <p className="text-[var(--berry)]">{error.message}</p>;
  }
  return <BrowseClient recipes={(data ?? []) as Recipe[]} />;
}

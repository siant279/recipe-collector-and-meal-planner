import { createClient } from "@/lib/supabase/server";
import { TodayPicks } from "@/components/TodayPicks";
import type { Recipe } from "@/lib/types";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select("*").order("title");

  if (error) {
    return (
      <p className="text-[var(--clay)]">
        Could not load recipes. Apply migrations and seed data first. ({error.message})
      </p>
    );
  }

  return <TodayPicks recipes={(data ?? []) as Recipe[]} />;
}

import { createClient } from "@/lib/supabase/server";
import { PlanClient } from "@/components/PlanClient";
import { todayISO } from "@/lib/recipes";
import type { MealPlanRow } from "@/lib/types";

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function PlanPage() {
  const supabase = await createClient();
  const start = todayISO();
  const end = addDays(start, 6);

  const { data, error } = await supabase
    .from("meal_plan")
    .select("*, recipes(*)")
    .gte("plan_date", start)
    .lte("plan_date", end)
    .order("plan_date");

  if (error) {
    return <p className="text-[var(--clay)]">{error.message}</p>;
  }

  return <PlanClient rows={(data ?? []) as MealPlanRow[]} />;
}

import { createClient } from "@/lib/supabase/server";
import { ShopClient } from "@/components/ShopClient";
import type { ShoppingListItem } from "@/lib/types";

export default async function ShopPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("*")
    .order("checked")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-[var(--berry)]">{error.message}</p>;
  }

  return <ShopClient items={(data ?? []) as ShoppingListItem[]} />;
}

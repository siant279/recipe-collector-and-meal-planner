import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUrlText, parseRecipeWithClaude } from "@/lib/parse-recipe";

type ImportItem = { title?: string; url: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { recipes?: ImportItem[] };
  const recipes = body.recipes ?? [];
  if (!recipes.length) {
    return NextResponse.json({ error: "No recipes selected" }, { status: 400 });
  }
  if (recipes.length > 25) {
    return NextResponse.json(
      { error: "Select at most 25 recipes at a time" },
      { status: 400 },
    );
  }

  const results: Array<{
    url: string;
    title: string;
    ok: boolean;
    submissionId?: string;
    error?: string;
  }> = [];

  for (const item of recipes) {
    const url = item.url.trim();
    const label = item.title?.trim() || url;
    try {
      const { data: sub, error: insertError } = await supabase
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
      if (insertError) throw new Error(insertError.message);

      const raw = await fetchUrlText(url);
      const parsed = await parseRecipeWithClaude(raw);
      parsed.source_url = url;
      if (!parsed.source) {
        try {
          parsed.source = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          // ignore
        }
      }

      // Guard: refuse empty/fake extracts
      if (
        !parsed.ingredients?.length ||
        parsed.title.toLowerCase().includes("unable to extract")
      ) {
        throw new Error(
          "Couldn’t extract a public recipe from this page. It may be paywalled — paste the recipe text instead.",
        );
      }

      const { error: updateError } = await supabase
        .from("recipe_submissions")
        .update({
          parsed_recipe: parsed,
          status: "needs_review",
          parse_error: null,
        })
        .eq("id", sub.id);
      if (updateError) throw new Error(updateError.message);

      results.push({
        url,
        title: parsed.title || label,
        ok: true,
        submissionId: sub.id,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Import failed";
      results.push({ url, title: label, ok: false, error: message });
    }
  }

  return NextResponse.json({
    ok: true,
    imported: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}

import Anthropic from "@anthropic-ai/sdk";
import type { ParsedRecipeDraft } from "@/lib/types";

const SYSTEM = `You extract kid-friendly recipes into JSON for a household meal planner.
Return ONLY valid JSON matching this shape:
{
  "title": string,
  "source": string | null,
  "meal_type": "breakfast" | "lunch" | "snack" | "dinner" | null,
  "servings": string | null,
  "prep_time": string | null,
  "cook_time": string | null,
  "ingredients": string[],
  "directions": string[],
  "optional_sides": string[],
  "choking_flags": string[],
  "tags": string[],
  "source_url": string | null
}
choking_flags should only include categories that clearly apply for children under 4:
"whole grapes", "hot dogs", "whole nuts/seeds", "popcorn", "hard raw veg/fruit chunks",
"cheese chunks", "nut/seed-butter spoonfuls", "marshmallows", "tough/whole meat pieces".
Ignore ads, blog life stories, and unrelated content.`;

export async function parseRecipeWithClaude(raw: string): Promise<ParsedRecipeDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Extract the recipe from this content:\n\n${raw.slice(0, 40000)}`,
      },
    ],
    system: SYSTEM,
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Model did not return JSON");

  const parsed = JSON.parse(jsonMatch[0]) as ParsedRecipeDraft;
  if (!parsed.title || !Array.isArray(parsed.ingredients)) {
    throw new Error("Parsed recipe missing title or ingredients");
  }
  parsed.ingredients = parsed.ingredients.filter(Boolean);
  parsed.directions = Array.isArray(parsed.directions)
    ? parsed.directions.filter(Boolean)
    : [];
  parsed.optional_sides = parsed.optional_sides ?? [];
  parsed.choking_flags = parsed.choking_flags ?? [];
  parsed.tags = parsed.tags ?? [];
  return parsed;
}

export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CamisMealPlanner/1.0 (+personal household recipe import)",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

import Anthropic from "@anthropic-ai/sdk";
import type { ParsedRecipeDraft } from "@/lib/types";

const SYSTEM = `You extract kid-friendly recipes into JSON for a household meal planner.
Return ONLY valid JSON matching this shape (no markdown fences, no commentary):
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
Rules:
- title and ingredients are required. ingredients must be a non-empty string array.
- choking_flags should only include categories that clearly apply for children under 4:
  "whole grapes", "hot dogs", "whole nuts/seeds", "popcorn", "hard raw veg/fruit chunks",
  "cheese chunks", "nut/seed-butter spoonfuls", "marshmallows", "tough/whole meat pieces".
- Ignore ads, blog life stories, navigation, and unrelated content.
- If the content includes schema.org Recipe JSON, prefer that.
- If you cannot find a real recipe, still return JSON with title "Unable to extract recipe" and ingredients: [] — do not invent a recipe.`;

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [item];
        if (item && typeof item === "object" && "text" in item) {
          return [String((item as { text: unknown }).text)];
        }
        return [String(item)];
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|•|;/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // fall through
  }

  // Prefer the largest {...} block that parses
  const matches = candidate.match(/\{[\s\S]*\}/g) ?? [];
  for (const block of [...matches].sort((a, b) => b.length - a.length)) {
    try {
      return JSON.parse(block);
    } catch {
      // try next
    }
  }
  throw new Error("Model did not return JSON");
}

function normalizeDraft(parsed: Record<string, unknown>): ParsedRecipeDraft {
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const ingredients = asStringArray(parsed.ingredients);
  const directions = asStringArray(parsed.directions);

  if (!title || ingredients.length === 0) {
    throw new Error(
      "Parsed recipe missing title or ingredients — try paste text instead, or a different URL",
    );
  }

  const mealType = parsed.meal_type;
  const validMeal =
    mealType === "breakfast" ||
    mealType === "lunch" ||
    mealType === "snack" ||
    mealType === "dinner"
      ? mealType
      : null;

  return {
    title,
    source: typeof parsed.source === "string" ? parsed.source : null,
    meal_type: validMeal,
    servings: typeof parsed.servings === "string" ? parsed.servings : null,
    prep_time: typeof parsed.prep_time === "string" ? parsed.prep_time : null,
    cook_time: typeof parsed.cook_time === "string" ? parsed.cook_time : null,
    ingredients,
    directions,
    optional_sides: asStringArray(parsed.optional_sides),
    choking_flags: asStringArray(parsed.choking_flags),
    tags: asStringArray(parsed.tags),
    source_url: typeof parsed.source_url === "string" ? parsed.source_url : null,
  };
}

/** Pull schema.org Recipe JSON-LD from HTML when present. */
export function extractRecipeJsonLd(html: string): string | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  const recipes: unknown[] = [];

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data)
        ? data
        : data?.["@graph"]
          ? data["@graph"]
          : [data];
      for (const node of nodes) {
        const type = node?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => String(t).toLowerCase() === "recipe")) {
          recipes.push(node);
        }
      }
    } catch {
      // ignore bad JSON-LD blocks
    }
  }

  if (!recipes.length) return null;
  return JSON.stringify(recipes[0], null, 2);
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function parseRecipeWithClaude(raw: string): Promise<ParsedRecipeDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (!raw.trim() || raw.trim().length < 40) {
    throw new Error(
      "Not enough page content to parse — site may block scrapers; paste the recipe text instead",
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Extract the recipe from this content:\n\n${raw.slice(0, 60000)}`,
      },
    ],
    system: SYSTEM,
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model did not return a recipe object");
  }
  return normalizeDraft(parsed as Record<string, unknown>);
}

export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CamisMealPlanner/1.0; +https://camis-meal-planner.vercel.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  const html = await res.text();

  const jsonLd = extractRecipeJsonLd(html);
  const plain = htmlToPlainText(html);

  if (jsonLd) {
    return [
      `Source URL: ${url}`,
      "",
      "Structured Recipe (schema.org JSON-LD):",
      jsonLd,
      "",
      "Page text excerpt:",
      plain.slice(0, 12000),
    ].join("\n");
  }

  if (plain.length < 80) {
    throw new Error(
      "Page returned almost no text (likely JavaScript-only). Paste the recipe text instead.",
    );
  }

  return [`Source URL: ${url}`, "", plain.slice(0, 50000)].join("\n");
}

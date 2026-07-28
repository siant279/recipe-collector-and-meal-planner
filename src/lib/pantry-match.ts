/**
 * Keyword pantry matching — no LLM.
 * Normalizes ingredient lines, ignores staples, ranks recipes by coverage.
 */

const STAPLES = new Set([
  "salt",
  "pepper",
  "black pepper",
  "white pepper",
  "water",
  "oil",
  "olive oil",
  "vegetable oil",
  "canola oil",
  "cooking oil",
  "butter",
  "unsalted butter",
  "salted butter",
  "garlic powder",
  "onion powder",
  "paprika",
  "cumin",
  "cinnamon",
  "sugar",
  "brown sugar",
  "flour",
  "all purpose flour",
  "all-purpose flour",
  "baking powder",
  "baking soda",
  "vanilla",
  "vanilla extract",
  "vinegar",
  "white vinegar",
  "apple cider vinegar",
  "soy sauce",
  "mayonnaise",
  "mayo",
  "ketchup",
  "mustard",
  "honey",
  "maple syrup",
  "lemon juice",
  "lime juice",
  "broth",
  "chicken broth",
  "vegetable broth",
  "stock",
  "chicken stock",
  "vegetable stock",
]);

const UNIT_WORDS = new Set([
  "cup",
  "cups",
  "tbsp",
  "tbs",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "liter",
  "litre",
  "pint",
  "quarts",
  "quart",
  "can",
  "cans",
  "package",
  "pkg",
  "clove",
  "cloves",
  "slice",
  "slices",
  "piece",
  "pieces",
  "pinch",
  "dash",
  "handful",
  "large",
  "medium",
  "small",
  "fresh",
  "frozen",
  "dried",
  "chopped",
  "minced",
  "sliced",
  "diced",
  "optional",
  "to",
  "taste",
  "or",
  "and",
  "of",
  "a",
  "an",
  "the",
  "about",
  "approximately",
  "extra",
  "virgin",
]);

/** Synonyms map: variant → canonical token used for matching */
const SYNONYMS: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  carrots: "carrot",
  onions: "onion",
  eggs: "egg",
  berries: "berry",
  strawberries: "strawberry",
  blueberries: "blueberry",
  bananas: "banana",
  apples: "apple",
  grapes: "grape",
  peppers: "pepper",
  bellpepper: "bell pepper",
  scallions: "scallion",
  greenonion: "scallion",
  greenonions: "scallion",
  chickpeas: "chickpea",
  garbanzobeans: "chickpea",
  garbanzo: "chickpea",
  yoghurt: "yogurt",
  mayo: "mayonnaise",
  cilantro: "coriander",
  groundbeef: "beef",
  groundturkey: "turkey",
  chickenbreast: "chicken",
  chickenthighs: "chicken",
  chickenthigh: "chicken",
};

export function normalizeIngredient(raw: string): string {
  let s = raw.toLowerCase();
  s = s.replace(/\([^)]*\)/g, " "); // drop parentheticals
  s = s.replace(/[\d½⅓⅔¼¾⅛⅜⅝⅞./\-–—]+/g, " ");
  s = s.replace(/[^a-z\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  const words = s.split(" ").filter((w) => w && !UNIT_WORDS.has(w));
  let joined = words.join(" ").trim();

  // Strip leading prep verbs leftovers
  joined = joined.replace(/^(drained|rinsed|thawed|cooked)\s+/, "");

  const compact = joined.replace(/\s+/g, "");
  if (SYNONYMS[compact]) return SYNONYMS[compact];
  if (SYNONYMS[joined]) return SYNONYMS[joined];

  // Simple plural strip for trailing s (not ss/ies)
  if (joined.endsWith("ies") && joined.length > 4) {
    joined = joined.slice(0, -3) + "y";
  } else if (joined.endsWith("oes") && joined.length > 4) {
    joined = joined.slice(0, -2);
  } else if (
    joined.endsWith("s") &&
    !joined.endsWith("ss") &&
    !joined.endsWith("us") &&
    joined.length > 3
  ) {
    joined = joined.slice(0, -1);
  }

  return joined.trim();
}

export function isStaple(normalized: string): boolean {
  if (!normalized) return true;
  if (STAPLES.has(normalized)) return true;
  // Partial: "kosher salt", "sea salt" etc.
  for (const staple of STAPLES) {
    if (normalized === staple) return true;
    if (normalized.endsWith(" " + staple) || normalized.startsWith(staple + " ")) {
      // avoid treating "black pepper" as the spice "pepper" for produce? pepper spice is staple
      if (staple === "pepper" && (normalized.includes("bell") || normalized.includes("chili") || normalized.includes("jalapeno"))) {
        continue;
      }
      return true;
    }
  }
  return false;
}

export function parsePantryInput(input: string): string[] {
  const parts = input
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const n = normalizeIngredient(part);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(part.trim());
  }
  return out;
}

function tokensOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const ta = new Set(a.split(" ").filter((t) => t.length > 2));
  const tb = b.split(" ").filter((t) => t.length > 2);
  if (!ta.size || !tb.length) return false;
  // Require majority of shorter token set to overlap
  const shorter = tb.length <= ta.size ? tb : [...ta];
  const longer = tb.length <= ta.size ? ta : new Set(tb);
  const hits = shorter.filter((t) => longer.has(t)).length;
  return hits >= Math.ceil(shorter.length * 0.6) && hits >= 1;
}

export type IngredientMatch = {
  original: string;
  normalized: string;
  matched: boolean;
  isStaple: boolean;
};

export type RecipeMatch = {
  recipeId: string;
  matchedCount: number;
  requiredCount: number;
  score: number; // 0–1 coverage of non-staple ingredients
  missing: string[];
  matched: string[];
  details: IngredientMatch[];
};

export function matchRecipeToPantry(
  ingredients: string[],
  pantryNormalized: Set<string>,
): RecipeMatch {
  const details: IngredientMatch[] = [];
  const missing: string[] = [];
  const matched: string[] = [];
  let matchedCount = 0;
  let requiredCount = 0;

  for (const original of ingredients) {
    const normalized = normalizeIngredient(original);
    if (!normalized) continue;
    const staple = isStaple(normalized);
    let hit = false;
    if (staple) {
      hit = true;
    } else {
      requiredCount += 1;
      for (const p of pantryNormalized) {
        if (tokensOverlap(normalized, p)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        matchedCount += 1;
        matched.push(original);
      } else {
        missing.push(original);
      }
    }
    details.push({ original, normalized, matched: hit, isStaple: staple });
  }

  const score = requiredCount === 0 ? (ingredients.length ? 1 : 0) : matchedCount / requiredCount;

  return {
    recipeId: "",
    matchedCount,
    requiredCount,
    score,
    missing,
    matched,
    details,
  };
}

export function rankRecipesByPantry<T extends { id: string; ingredients: string[] }>(
  recipes: T[],
  pantryTexts: string[],
  opts?: { minScore?: number; maxMissing?: number },
): Array<T & { match: RecipeMatch }> {
  const minScore = opts?.minScore ?? 0.4;
  const maxMissing = opts?.maxMissing ?? 99;
  const pantryNormalized = new Set(
    pantryTexts.map(normalizeIngredient).filter((n) => n && !isStaple(n)),
  );

  const ranked: Array<T & { match: RecipeMatch }> = [];
  for (const recipe of recipes) {
    const match = matchRecipeToPantry(recipe.ingredients ?? [], pantryNormalized);
    match.recipeId = recipe.id;
    if (match.requiredCount === 0) continue; // nothing meaningful to match
    if (match.score < minScore) continue;
    if (match.missing.length > maxMissing) continue;
    ranked.push({ ...recipe, match });
  }

  ranked.sort((a, b) => {
    if (b.match.score !== a.match.score) return b.match.score - a.match.score;
    if (a.match.missing.length !== b.match.missing.length) {
      return a.match.missing.length - b.match.missing.length;
    }
    return b.match.matchedCount - a.match.matchedCount;
  });

  return ranked;
}

export type DiscoveredRecipe = {
  title: string;
  url: string;
};

const RECIPE_PATH =
  /\/recipes?(?:\/|$)|\/recipe\/|\/easy-recipes\/|\/cooking\/.*recipe/i;

const SKIP_PATH =
  /\/(tag|tags|category|categories|search|account|login|subscribe|gift|collections?|article\/?$)/i;

const PAYWALL_MARKERS = [
  "subscribe to continue",
  "already a subscriber",
  "log in to view",
  "sign in to view",
  "create a free account",
  "subscription is required",
  "subscribers only",
  "become a subscriber",
  "nyt cooking subscription",
  "this recipe is for subscribers",
];

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    const u = new URL(href, baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function looksLikeRecipeUrl(url: string, pageUrl: string): boolean {
  try {
    const u = new URL(url);
    const page = new URL(pageUrl);
    // Same-site recipe paths are strongest signal
    if (SKIP_PATH.test(u.pathname)) return false;
    if (RECIPE_PATH.test(u.pathname)) return true;
    // NYT Cooking recipes live under /recipes/
    if (u.hostname.includes("nytimes.com") && u.pathname.includes("/recipes/")) {
      return true;
    }
    // Same host, path has a slug after /recipe(s)/
    if (u.hostname === page.hostname && /\/recipes?\/[^/]+/i.test(u.pathname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function cleanTitle(raw: string): string {
  let t = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  t = t.replace(/^recipe:\s*/i, "").trim();
  if (t.length > 120) t = t.slice(0, 117) + "…";
  return t;
}

/** Extract candidate recipe links from a roundup / article HTML page. */
export function extractRecipeLinksFromHtml(
  html: string,
  pageUrl: string,
): DiscoveredRecipe[] {
  const byUrl = new Map<string, DiscoveredRecipe>();
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(html)) !== null) {
    const href = match[1];
    const inner = match[2].replace(/<[^>]+>/g, " ");
    const absolute = resolveUrl(href, pageUrl);
    if (!absolute || absolute === pageUrl) continue;
    if (!looksLikeRecipeUrl(absolute, pageUrl)) continue;

    // Normalize: drop query tracking
    let canonical = absolute;
    try {
      const u = new URL(absolute);
      u.search = "";
      canonical = u.toString().replace(/\/$/, "");
    } catch {
      // keep
    }

    const title = cleanTitle(inner);
    if (!title || title.length < 3) continue;
    // Skip nav junk
    if (/^(home|recipes?|cooking|subscribe|log ?in|sign ?in)$/i.test(title)) continue;

    const existing = byUrl.get(canonical);
    // Prefer longer, more descriptive titles
    if (!existing || title.length > existing.title.length) {
      byUrl.set(canonical, { title, url: canonical });
    }
  }

  return [...byUrl.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function pageHasRecipeJsonLd(html: string): boolean {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const m of scripts) {
    try {
      const data = JSON.parse(m[1]!.trim());
      const nodes = Array.isArray(data)
        ? data
        : data?.["@graph"]
          ? data["@graph"]
          : [data];
      for (const node of nodes) {
        const type = node?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => String(t).toLowerCase() === "recipe")) return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export function detectPaywall(html: string, plainText: string): string | null {
  const hay = `${html}\n${plainText}`.toLowerCase();
  for (const marker of PAYWALL_MARKERS) {
    if (hay.includes(marker)) {
      return "This recipe looks paywalled or login-gated. Public scrape only — paste the recipe text instead.";
    }
  }
  // Thin pages without structured recipe data
  if (!pageHasRecipeJsonLd(html) && plainText.length < 400) {
    return "Couldn’t get enough public recipe content from this page (blocked or empty). Paste the recipe text instead.";
  }
  return null;
}

export type DiscoverResult = {
  mode: "single" | "list";
  pageUrl: string;
  pageTitle: string | null;
  recipes: DiscoveredRecipe[];
};

export function discoverFromHtml(html: string, pageUrl: string): DiscoverResult {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch
    ? cleanTitle(titleMatch[1].replace(/\s*[|\-–].*$/, ""))
    : null;

  const links = extractRecipeLinksFromHtml(html, pageUrl);
  const selfIsRecipe =
    pageHasRecipeJsonLd(html) || looksLikeRecipeUrl(pageUrl, pageUrl);

  // Roundup: many distinct recipe links
  if (links.length >= 2) {
    return { mode: "list", pageUrl, pageTitle, recipes: links };
  }

  // Single recipe page (itself)
  if (selfIsRecipe || links.length <= 1) {
    const self: DiscoveredRecipe = {
      title: pageTitle || "Recipe from URL",
      url: pageUrl,
    };
    return {
      mode: "single",
      pageUrl,
      pageTitle,
      recipes: links.length === 1 ? links : [self],
    };
  }

  return { mode: "single", pageUrl, pageTitle, recipes: [{ title: pageTitle || "Recipe", url: pageUrl }] };
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RecipeCollectorMealPlanner/1.0; +https://camis-meal-planner.vercel.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  return res.text();
}
